import { NextRequest, NextResponse } from "next/server";
import { matchProducts } from "@/lib/match";
import { normalize } from "@/lib/normalize";
import { scrapeBlinkit } from "@/lib/scrapers/blinkit";
import { scrapeInstamart } from "@/lib/scrapers/instamart";
import { scrapeZepto } from "@/lib/scrapers/zepto";
import { getCachedSearch, setCachedSearch } from "@/lib/supabase";
import { NormalizedProduct, SearchResponse } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, lat, lon } = body as { query: string; lat: number; lon: number };

    if (!query || typeof lat !== "number" || typeof lon !== "number") {
      return NextResponse.json(
        { error: "query, lat, lon are required" },
        { status: 400 },
      );
    }

    // Cache hit?
    const cached = await getCachedSearch(query, lat, lon);
    if (cached) {
      return NextResponse.json({ ...cached, cachedAt: cached.cachedAt || new Date().toISOString() });
    }

    // Fan out to all 3 scrapers in parallel. Each isolates its own errors.
    const [blinkitRes, zeptoRes, instamartRes] = await Promise.all([
      scrapeBlinkit(query, lat, lon).catch((e) => {
        console.error("blinkit threw:", e);
        return { products: [], status: "error" as const };
      }),
      scrapeZepto(query, lat, lon).catch((e) => {
        console.error("zepto threw:", e);
        return { products: [], status: "error" as const };
      }),
      scrapeInstamart(query, lat, lon).catch((e) => {
        console.error("instamart threw:", e);
        return { products: [], status: "error" as const };
      }),
    ]);

    const byPlatform = {
      blinkit: blinkitRes.products.map(normalize) as NormalizedProduct[],
      zepto: zeptoRes.products.map(normalize) as NormalizedProduct[],
      instamart: instamartRes.products.map(normalize) as NormalizedProduct[],
    };

    const matched = matchProducts(byPlatform);

    const response: SearchResponse = {
      query,
      location: { lat, lon },
      results: matched,
      platformStatus: {
        blinkit: blinkitRes.status,
        zepto: zeptoRes.status,
        instamart: instamartRes.status,
      },
      cachedAt: new Date().toISOString(),
    };

    await setCachedSearch(query, lat, lon, response).catch(() => {});

    return NextResponse.json(response);
  } catch (err) {
    console.error("[search] route error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
