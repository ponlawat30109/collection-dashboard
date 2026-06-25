import { getAuthedSupabase, json, normalizeUrl, options } from "../_shared/api.js";

export function onRequestOptions({ request, env }) {
  return options(request, env);
}

export async function onRequestPost({ request, env }) {
  try {
    const { supabase, user, error } = await getAuthedSupabase(request, env);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const collectionId = String(body.collection_id ?? "").trim();
    if (!collectionId) return json(request, env, { error: "Collection is required" }, 400);

    let normalized;
    try {
      normalized = normalizeUrl(body.url);
    } catch {
      return json(request, env, { error: "Enter a valid URL." }, 400);
    }

    const { data: collection, error: collectionError } = await supabase
      .from("collections")
      .select("id")
      .eq("id", collectionId)
      .single();
    if (collectionError || !collection) {
      return json(request, env, { error: "Collection not found" }, 404);
    }

    const { data: existing, error: existingError } = await supabase
      .from("websites")
      .select("id,collection_id,title,url,website,position")
      .eq("collection_id", collectionId)
      .eq("url", normalized.url)
      .maybeSingle();
    if (existingError) return json(request, env, { error: existingError.message }, 400);
    if (existing) {
      return json(request, env, {
        error: "This website already exists in the collection.",
        website: {
          id: existing.id,
          collection_id: existing.collection_id,
          title: existing.title,
          url: existing.url,
          website: existing.website,
          position: existing.position,
        },
      }, 409);
    }

    const { data: currentWebsites, error: listError } = await supabase
      .from("websites")
      .select("position")
      .eq("collection_id", collectionId);
    if (listError) return json(request, env, { error: listError.message }, 400);

    const title = String(body.title ?? "").trim() || normalized.website;
    const nextPosition = Math.max(0, ...(currentWebsites ?? []).map((item) => item.position)) + 1;
    const { data: website, error: insertError } = await supabase
      .from("websites")
      .insert({
        collection_id: collectionId,
        user_id: user.id,
        title: title.slice(0, 300),
        url: normalized.url,
        website: normalized.website,
        position: nextPosition,
      })
      .select("id,collection_id,title,url,website,position")
      .single();
    if (insertError) return json(request, env, { error: insertError.message }, 400);

    return json(request, env, { website }, 201);
  } catch {
    return json(request, env, { error: "Could not save website" }, 500);
  }
}
