// Zepto scraper using Playwright.
// Zepto's web app requires a location pin before showing results.

import { RawProduct } from "@/types";
import { newContext, setLocation } from "../browser";

export async function scrapeZepto(
  query: string,
  lat: number,
  lon: number,
): Promise<{ products: RawProduct[]; status: "ok" | "error" | "not_serviceable" }> {
  let context;
  try {
    context = await newContext();
    await setLocation(context, lat, lon);
    const page = await context.newPage();

    // Set lat/lon in cookies/storage that Zepto reads on first load
    await page.addInitScript(({ lat, lon }) => {
      localStorage.setItem("user_lat", String(lat));
      localStorage.setItem("user_lng", String(lon));
      localStorage.setItem("user_location", JSON.stringify({ latitude: lat, longitude: lon }));
    }, { lat, lon });

    await page.goto("https://www.zeptonow.com/", { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(2500);

    const searchUrl = `https://www.zeptonow.com/search?query=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(3500);

    const notServiceable = await page
      .locator("text=/not serviceable|not available in your area|coming soon/i")
      .first()
      .isVisible()
      .catch(() => false);
    if (notServiceable) {
      return { products: [], status: "not_serviceable" };
    }

    const products = await page.evaluate(() => {
      const items: Array<{
        id: string;
        name: string;
        price: number;
        mrp: number;
        quantity: string;
        imageUrl: string;
        available: boolean;
      }> = [];

      const cards = document.querySelectorAll(
        'a[href*="/pn/"], [data-testid*="product"], [class*="product-card"]',
      );

      cards.forEach((card, i) => {
        const nameEl =
          card.querySelector('[data-testid*="product-card-name"]') ||
          card.querySelector("h5") ||
          card.querySelector("h4") ||
          card.querySelector('p[class*="name"]');
        const name = nameEl?.textContent?.trim() || "";

        const priceText = card.textContent || "";
        const priceMatch = priceText.match(/₹\s*(\d+(?:\.\d+)?)/);
        const allPrices = [...priceText.matchAll(/₹\s*(\d+(?:\.\d+)?)/g)].map((m) =>
          parseFloat(m[1]),
        );

        const quantityEl =
          card.querySelector('[data-testid*="product-card-quantity"]') ||
          card.querySelector('p[class*="quantity"]') ||
          card.querySelector('[class*="weight"]');
        const quantity = quantityEl?.textContent?.trim() || "";

        const img = card.querySelector("img");
        const imageUrl = img?.getAttribute("src") || "";
        const href = card.getAttribute("href") || "";
        const id = href || `zepto-${i}-${name.slice(0, 20)}`;
        const available = !priceText.toLowerCase().includes("notify me");

        if (name && priceMatch) {
          items.push({
            id,
            name,
            price: Math.min(...allPrices), // Selling price (usually lower)
            mrp: Math.max(...allPrices),
            quantity,
            imageUrl,
            available,
          });
        }
      });

      return items;
    });

    const normalized: RawProduct[] = products.slice(0, 20).map((p) => ({
      platform: "zepto" as const,
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      price: p.price,
      mrp: p.mrp,
      quantity: p.quantity,
      available: p.available,
      deepLink: p.id.startsWith("/")
        ? `https://www.zeptonow.com${p.id}`
        : `https://www.zeptonow.com/search?query=${encodeURIComponent(query)}`,
    }));

    return { products: normalized, status: "ok" };
  } catch (err) {
    console.error("[zepto] scrape error:", err);
    return { products: [], status: "error" };
  } finally {
    if (context) await context.close().catch(() => {});
  }
}
