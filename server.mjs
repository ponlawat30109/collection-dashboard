import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dataPath = join(root, "data", "collections.json");
const temporaryPath = `${dataPath}.tmp`;
const host = "127.0.0.1";
const port = 8765;

function isPrivateAddress(address) {
  return (
    address === "::1" ||
    address === "0.0.0.0" ||
    address.startsWith("10.") ||
    address.startsWith("127.") ||
    address.startsWith("169.254.") ||
    address.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(address) ||
    address.startsWith("fc") ||
    address.startsWith("fd") ||
    address.startsWith("fe80:")
  );
}

async function assertPublicUrl(url) {
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Private network URLs are not allowed");
  }
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

async function getPageTitle(url) {
  await assertPublicUrl(url);
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": "Mozilla/5.0 CollectionsDashboard/1.0" },
  });
  if (!response.ok) throw new Error(`Page returned ${response.status}`);
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) throw new Error("URL is not an HTML page");
  const html = (await response.text()).slice(0, 1_000_000);
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) throw new Error("Page title not found");
  return decodeHtml(match[1].replace(/\s+/g, " ").trim());
}

async function readData() {
  return JSON.parse(await readFile(dataPath, "utf8"));
}

async function saveData(data) {
  await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(temporaryPath, dataPath);
}

function send(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  });
  response.end(body);
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const path = url.pathname;
    if (request.method === "OPTIONS") return send(response, 204, {});

    if (request.method === "GET" && path === "/api/data") {
      return send(response, 200, await readData());
    }

    if (request.method === "GET" && path === "/api/title") {
      const rawUrl = url.searchParams.get("url") ?? "";
      let parsedUrl;
      try {
        parsedUrl = new URL(rawUrl);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error();
      } catch {
        return send(response, 400, { error: "Enter a valid http or https URL" });
      }
      try {
        return send(response, 200, { title: await getPageTitle(parsedUrl) });
      } catch (error) {
        return send(response, 422, { error: error.message });
      }
    }

    if (request.method === "POST" && path === "/api/collections") {
      const data = await readData();
      const title = String((await readBody(request)).title ?? "").trim();
      if (!title) return send(response, 400, { error: "Collection name is required" });
      if (title.length > 120) return send(response, 400, { error: "Collection name is too long" });
      if (data.collections.some((item) => item.title.toLowerCase() === title.toLowerCase())) {
        return send(response, 409, { error: "A collection with that name already exists" });
      }
      const collection = {
        id: randomUUID(),
        title,
        position: Math.max(998, ...data.collections.map((item) => item.position)) + 1,
        websites: [],
      };
      data.collections.push(collection);
      await saveData(data);
      return send(response, 201, { collection });
    }

    if (request.method === "POST" && path.startsWith("/api/collections/") && path.endsWith("/items")) {
      const data = await readData();
      const collectionId = decodeURIComponent(
        path.slice("/api/collections/".length, -"/items".length),
      );
      const collection = data.collections.find((item) => item.id === collectionId);
      if (!collection) return send(response, 404, { error: "Collection not found" });

      const body = await readBody(request);
      let title = String(body.title ?? "").trim();
      const rawUrl = String(body.url ?? "").trim();

      let parsedUrl;
      try {
        parsedUrl = new URL(rawUrl);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error();
      } catch {
        return send(response, 400, { error: "Enter a valid http or https URL" });
      }

      const normalizedUrl = parsedUrl.toString();
      if (collection.websites.some((item) => item.url === normalizedUrl)) {
        return send(response, 409, { error: "This website already exists in the collection" });
      }

      if (!title) {
        try {
          title = await getPageTitle(parsedUrl);
        } catch {
          title = parsedUrl.hostname.replace(/^www\./, "");
        }
      }
      if (title.length > 300) title = title.slice(0, 300);

      const website = {
        id: randomUUID(),
        title,
        url: normalizedUrl,
        website: parsedUrl.hostname.replace(/^www\./, ""),
        position: Math.max(0, ...collection.websites.map((item) => item.position)) + 1,
      };
      collection.websites.push(website);
      await saveData(data);
      return send(response, 201, { website });
    }

    if (request.method === "DELETE" && path.startsWith("/api/collections/")) {
      const data = await readData();
      const id = decodeURIComponent(path.slice("/api/collections/".length));
      const index = data.collections.findIndex((item) => item.id === id);
      if (index < 0) return send(response, 404, { error: "Collection not found" });
      const [deleted] = data.collections.splice(index, 1);
      await saveData(data);
      return send(response, 200, { deleted: id, deletedWebsites: deleted.websites.length });
    }

    if (request.method === "DELETE" && path.startsWith("/api/items/")) {
      const data = await readData();
      const id = decodeURIComponent(path.slice("/api/items/".length));
      for (const collection of data.collections) {
        const index = collection.websites.findIndex((item) => item.id === id);
        if (index >= 0) {
          collection.websites.splice(index, 1);
          await saveData(data);
          return send(response, 200, { deleted: id });
        }
      }
      return send(response, 404, { error: "Website not found" });
    }

    return send(response, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    return send(response, 500, { error: "Local data operation failed" });
  }
});

server.listen(port, host, () => {
  console.log(`Collections JSON API running at http://${host}:${port}`);
});
