import { createClient } from "@supabase/supabase-js";

const DEFAULT_ALLOWED_HEADERS = "Authorization, Content-Type";
const DEFAULT_ALLOWED_METHODS = "GET, POST, OPTIONS";

function getAllowedOrigins(env) {
  return String(env.ALLOWED_EXTENSION_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin, env) {
  if (!origin) return true;
  if (origin.startsWith("chrome-extension://") || origin.startsWith("moz-extension://")) return true;
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) return true;
  return getAllowedOrigins(env).includes(origin);
}

export function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") ?? "";
  const headers = {
    "Access-Control-Allow-Headers": DEFAULT_ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": DEFAULT_ALLOWED_METHODS,
    "Vary": "Origin",
  };
  if (isAllowedOrigin(origin, env)) {
    headers["Access-Control-Allow-Origin"] = origin || "*";
  }
  return headers;
}

export function json(request, env, payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(request, env),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export function options(request, env) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, env),
  });
}

export function getSupabaseConfig(env) {
  const url = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are missing.");
  return { url, key };
}

export async function getAuthedSupabase(request, env) {
  const authorization = request.headers.get("Authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { error: json(request, env, { error: "Missing bearer token" }, 401) };
  }

  const accessToken = match[1].trim();
  const { url, key } = getSupabaseConfig(env);
  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return { error: json(request, env, { error: "Invalid or expired token" }, 401) };
  }

  return { supabase, user: data.user };
}

export function normalizeUrl(rawUrl) {
  const parsed = new URL(String(rawUrl ?? "").trim());
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Enter a valid URL.");
  return {
    url: parsed.toString(),
    website: parsed.hostname.replace(/^www\./, ""),
  };
}
