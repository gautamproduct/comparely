# Comparely

Compare real-time grocery prices across **Blinkit**, **Zepto**, and **Instamart** — with per-unit pricing so you know what's actually the best deal.

A clone of [comparify.pro](https://comparify.pro), built from scratch with Next.js + Playwright.

## Features

- **Live price comparison** across 3 quick-commerce platforms
- **Per-unit pricing** (₹/100g, ₹/100ml) — the real "is this a good deal?" metric
- **Smart product matching** — recognizes "Amul Butter 500g" = "Salted Butter Amul 500gm"
- **Cart total comparison** — add items, see which platform is cheapest overall
- **Location-aware** — uses your area's lat/lon for accurate, location-specific prices
- **Dark mode** by default, mobile-first responsive design

## Stack

| Layer | Tool |
|---|---|
| Frontend | Next.js 16 (App Router) + Tailwind 4 |
| Scraping | Playwright (headless Chromium) |
| Geocoding | OpenStreetMap Nominatim (free, no API key) |
| Cache | Supabase Postgres (15-min TTL) |
| Hosting | Vercel (frontend) + Railway/Render (backend with Playwright) |

## Run locally

```bash
npm install
npx playwright install chromium
cp .env.example .env.local
# Optionally add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for caching
npm run dev
```

Open http://localhost:3000.

## Deploy

**Recommended: Deploy everything on Railway** (Playwright needs real server, not Vercel's serverless functions).

1. Push to GitHub (`gautamproduct/comparely`).
2. Go to [railway.app](https://railway.app), New Project → Deploy from GitHub.
3. Railway auto-detects the Dockerfile.
4. Add env vars `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
5. Add your custom domain.

**Supabase setup:**
1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. Run `supabase/schema.sql` in the SQL editor.
3. Copy the project URL and service role key into Railway env vars.

## Architecture

```
User → Next.js page
         ↓
    /api/geocode → Nominatim → lat/lon
         ↓
    /api/search → Playwright × 3 (parallel)
         ↓                ↓                ↓
      Blinkit          Zepto          Instamart
         ↓                ↓                ↓
       Normalize → Match → Per-unit price → Cache → JSON
```

Each scraper is isolated — if one fails, the other two still return results.

## Caveats

- Scraping is brittle by nature; platforms change their DOM and the scrapers may need tweaking.
- Catalogue prices only — final checkout total (delivery fee, subscription discounts, coupons) can differ.
- Not affiliated with Blinkit, Zepto, or Instamart.

## License

MIT
