import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Cache TTL: 15 minutes — prices change slowly enough that this is safe.
export const CACHE_TTL_MS = 15 * 60 * 1000;

export async function getCachedSearch(
  query: string,
  lat: number,
  lon: number,
) {
  if (!supabase) return null;
  const cacheKey = makeCacheKey(query, lat, lon);
  const { data, error } = await supabase
    .from("search_cache")
    .select("*")
    .eq("cache_key", cacheKey)
    .single();
  if (error || !data) return null;
  const cachedAt = new Date(data.created_at).getTime();
  if (Date.now() - cachedAt > CACHE_TTL_MS) return null;
  return data.payload;
}

export async function setCachedSearch(
  query: string,
  lat: number,
  lon: number,
  payload: unknown,
) {
  if (!supabase) return;
  const cacheKey = makeCacheKey(query, lat, lon);
  await supabase
    .from("search_cache")
    .upsert({ cache_key: cacheKey, payload, created_at: new Date().toISOString() });
}

function makeCacheKey(query: string, lat: number, lon: number): string {
  // Round lat/lon to ~1km precision so nearby users share cache
  const latR = Math.round(lat * 100) / 100;
  const lonR = Math.round(lon * 100) / 100;
  return `${query.trim().toLowerCase()}|${latR}|${lonR}`;
}
