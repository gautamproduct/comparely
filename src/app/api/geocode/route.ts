// Geocode a location string to lat/lon using OpenStreetMap Nominatim.
// Free, no API key, but rate-limited — we cache locally per session and apply User-Agent.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 3) {
    return NextResponse.json({ error: "q must be at least 3 characters" }, { status: 400 });
  }

  try {
    // Bias to India
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      q + ", India",
    )}&format=json&limit=5&countrycodes=in&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Comparely/1.0 (comparely.app)",
        "Accept-Language": "en",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
    }

    const data = (await res.json()) as NominatimResult[];
    const suggestions = data.map((r) => ({
      label: r.display_name,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
    }));

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[geocode] error:", err);
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}
