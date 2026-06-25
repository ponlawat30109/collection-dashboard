import { getAuthedSupabase, json, options } from "../_shared/api.js";

export function onRequestOptions({ request, env }) {
  return options(request, env);
}

export async function onRequestGet({ request, env }) {
  try {
    const { supabase, error } = await getAuthedSupabase(request, env);
    if (error) return error;

    const [{ data: collections, error: collectionError }, { data: websites, error: websiteError }] = await Promise.all([
      supabase.from("collections").select("id,title,position").order("position"),
      supabase.from("websites").select("collection_id"),
    ]);
    const failure = collectionError ?? websiteError;
    if (failure) return json(request, env, { error: failure.message }, 400);

    const websiteCounts = new Map();
    for (const website of websites ?? []) {
      websiteCounts.set(website.collection_id, (websiteCounts.get(website.collection_id) ?? 0) + 1);
    }

    return json(request, env, (collections ?? []).map((collection) => ({
      id: collection.id,
      title: collection.title,
      position: collection.position,
      website_count: websiteCounts.get(collection.id) ?? 0,
    })));
  } catch {
    return json(request, env, { error: "Could not load collections" }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { supabase, user, error } = await getAuthedSupabase(request, env);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const title = String(body.title ?? "").trim();
    if (!title) return json(request, env, { error: "Collection name is required" }, 400);
    if (title.length > 120) return json(request, env, { error: "Collection name is too long" }, 400);

    const { data: existing, error: existingError } = await supabase
      .from("collections")
      .select("id")
      .ilike("title", title)
      .maybeSingle();
    if (existingError) return json(request, env, { error: existingError.message }, 400);
    if (existing) return json(request, env, { error: "A collection with that name already exists" }, 409);

    const { data: currentCollections, error: listError } = await supabase
      .from("collections")
      .select("position");
    if (listError) return json(request, env, { error: listError.message }, 400);

    const nextPosition = Math.max(0, ...(currentCollections ?? []).map((item) => item.position)) + 1;
    const { data: collection, error: insertError } = await supabase
      .from("collections")
      .insert({
        title,
        user_id: user.id,
        position: nextPosition,
      })
      .select("id,title,position")
      .single();
    if (insertError) return json(request, env, { error: insertError.message }, 400);

    return json(request, env, { ...collection, website_count: 0 }, 201);
  } catch {
    return json(request, env, { error: "Could not create collection" }, 500);
  }
}
