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

type ScrapeResult = { products: import("@/types").RawProduct[]; status: "ok" | "error" | "not_serviceable" };

async function safeScrape(
  name: string,
  fn: () => Promise<ScrapeResult>,
): Promise<ScrapeResult> {
  try {
    console.log(`[${name}] starting`);
    const t0 = Date.now();
    const res = await fn();
    console.log(`[${name}] done in ${Date.now() - t0}ms — status: ${res.status}, products: ${res.products.length}`);
    return res;
  } catch (err) {
    console.error(`[${name}] threw:`, err instanceof Error ? err.message : err);
    if (err instanceof Error && err.stack) console.error(err.stack);
    return { products: [], status: "error" };
  }
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const body = await req.json();
    const { query, lat, lon } = body as { query: string; lat: number; lon: number };

    if (!query || typeof lat !== "number" || typeof lon !== "number") {
      return NextResponse.json(
        { error: "query, lat, lon are required" },
        { status: 400 },
      );
    }

    console.log(`[search] query="${query}" lat=${lat} lon=${lon}`);

    // Cache hit?
    const cached = await getCachedSearch(query, lat, lon).catch(() => null);
    if (cached) {
      console.log(`[search] cache hit`);
      return NextResponse.json({ ...cached, cachedAt: cached.cachedAt || new Date().toISOString() });
    }

    // SERIAL execution to fit in 512MB RAM (Railway free tier).
    // Trade: ~25s total instead of ~10s, but no OOM crashes.
    const blinkitRes = await safeScrape("blinkit", () => scrapeBlinkit(query, lat, lon));
    const zeptoRes = await safeScrape("zepto", () => scrapeZepto(query, lat, lon));
    const instamartRes = await safeScrape("instamart", () => scrapeInstamart(query, lat, lon));

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

    console.log(`[search] complete in ${Date.now() - t0}ms — matched ${matched.length} groups`);
    return NextResponse.json(response);
  } catch (err) {
    console.error("[search] FATAL route error:", err instanceof Error ? err.message : err);
    if (err instanceof Error && err.stack) console.error(err.stack);
    // Return 200 with empty results + error status so the UI doesn't show a generic failure.
    return NextResponse.json(
      {
        query: "",
        location: { lat: 0, lon: 0 },
        results: [],
        platformStatus: { blinkit: "error", zepto: "error", instamart: "error" },
        error: err instanceof Error ? err.message : "Unknown server error",
      },
      { status: 200 },
    );
  }
}
