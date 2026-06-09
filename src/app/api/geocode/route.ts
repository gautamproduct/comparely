// Geocode a location string to lat/lon using OpenStreetMap Nominatim.
// Free, no API key, but rate-limited. We cache in-memory and degrade gracefully.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
}

// Simple in-memory LRU-ish cache (per Node process)
const CACHE = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 min — locations don't change

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const cacheKey = q.trim().toLowerCase();
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      q + ", India",
    )}&format=json&limit=5&countrycodes=in&addressdetails=1`;

    // 5-second timeout — fail fast if Nominatim is slow
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Comparely/1.0 (https://comparely.app contact@comparely.app)",
        "Accept-Language": "en",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      // Don't return 502 — return empty so UI doesn't show errors during typing
      return NextResponse.json({ suggestions: [] });
    }

    const data = (await res.json()) as NominatimResult[];
    const suggestions = data.map((r) => ({
      label: r.display_name,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
    }));

    const payload = { suggestions };
    CACHE.set(cacheKey, { data: payload, ts: Date.now() });
    // Trim cache if it gets too big
    if (CACHE.size > 500) {
      const oldest = [...CACHE.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      if (oldest) CACHE.delete(oldest[0]);
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[geocode] error:", err instanceof Error ? err.message : err);
    // Always return empty rather than error — geocoding is a "nice to have"
    return NextResponse.json({ suggestions: [] });
  }
}
