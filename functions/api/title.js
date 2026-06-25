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

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function onRequestGet({ request }) {
  const requestUrl = new URL(request.url);
  const rawUrl = requestUrl.searchParams.get("url") ?? "";

  let pageUrl;
  try {
    pageUrl = new URL(rawUrl);
    if (!["http:", "https:"].includes(pageUrl.protocol)) throw new Error();
  } catch {
    return json({ error: "Enter a valid http or https URL" }, 400);
  }

  try {
    const response = await fetch(pageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 CollectionsDashboard/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return json({ error: `Page returned ${response.status}` }, 422);

    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("text/html")) return json({ error: "URL is not an HTML page" }, 422);

    const html = (await response.text()).slice(0, 1_000_000);
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!match) return json({ error: "Page title not found" }, 422);

    const title = decodeHtml(match[1].replace(/\s+/g, " ").trim()).slice(0, 300);
    return json({ title });
  } catch {
    return json({ error: "Could not read page title" }, 422);
  }
}
