import { RawProduct } from "@/types";
import { withBrowser } from "../browser";

export async function scrapeZepto(
  query: string,
  lat: number,
  lon: number,
): Promise<{ products: RawProduct[]; status: "ok" | "error" | "not_serviceable" }> {
  return withBrowser(
    async (context) => {
      const page = await context.newPage();

      await page.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      });

      const apiPayloads: Array<{ url: string; sample: string }> = [];
      page.on("response", async (response) => {
        try {
          const url = response.url();
          const ct = response.headers()["content-type"] || "";
          if (!ct.includes("application/json")) return;
          if (!/search|product|listing|catalog/i.test(url)) return;
          const text = await response.text();
          if (text.includes("₹") || /price|mrp|sellingPrice/i.test(text)) {
            apiPayloads.push({ url, sample: text.slice(0, 500) });
          }
        } catch {}
      });

      await page.addInitScript(({ lat, lon }) => {
        try {
          localStorage.setItem("user_lat", String(lat));
          localStorage.setItem("user_lng", String(lon));
          localStorage.setItem("user_location", JSON.stringify({ latitude: lat, longitude: lon }));
        } catch {}
      }, { lat, lon });

      await page.goto("https://www.zeptonow.com/", {
        waitUntil: "domcontentloaded",
        timeout: 25000,
      });
      await page.waitForTimeout(2500);

      const searchUrl = `https://www.zeptonow.com/search?query=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(2000);

      const pageTitle = await page.title();
      const pageUrl = page.url();
      console.log(`[zepto] page="${pageTitle}" url="${pageUrl}"`);

      const notServiceable = await page
        .locator("text=/not serviceable|not available in your area|coming soon/i")
        .first()
        .isVisible()
        .catch(() => false);
      if (notServiceable) {
        return { products: [], status: "not_serviceable" as const };
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

        const cardSelectors = [
          'a[href*="/pn/"]',
          '[data-testid*="product"]',
          '[class*="product-card"]',
          '[class*="ProductCard"]',
          '[class*="ProductItem"]',
          'div[role="button"][class*="product"]',
        ];
        const cards = new Set<Element>();
        cardSelectors.forEach((sel) => document.querySelectorAll(sel).forEach((el) => cards.add(el)));

        cards.forEach((card, i) => {
          const text = card.textContent || "";
          const priceMatches = [...text.matchAll(/₹\s*(\d+(?:\.\d+)?)/g)].map((m) =>
            parseFloat(m[1]),
          );
          if (priceMatches.length === 0) return;

          const name =
            card.querySelector('[data-testid*="name"], h5, h4, h3, [class*="Name"], [class*="title"]')
              ?.textContent?.trim() || "";
          const quantity =
            card.querySelector('[data-testid*="quantity"], [class*="Quantity"], [class*="weight"]')
              ?.textContent?.trim() || "";
          const img = card.querySelector("img");
          const imageUrl = img?.getAttribute("src") || "";
          const href = card.getAttribute("href") || "";
          const id = href || `zepto-${i}-${name.slice(0, 20)}`;

          if (name) {
            items.push({
              id,
              name,
              price: Math.min(...priceMatches),
              mrp: Math.max(...priceMatches),
              quantity,
              imageUrl,
              available: !text.toLowerCase().includes("notify me"),
            });
          }
        });

        return items;
      });

      if (products.length === 0) {
        const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 500));
        console.log(`[zepto] 0 products. Body snippet:\n${bodySnippet}`);
        if (apiPayloads.length > 0) {
          console.log(`[zepto] captured ${apiPayloads.length} JSON API payloads:`);
          for (const p of apiPayloads.slice(0, 3)) {
            console.log(`  URL: ${p.url}`);
            console.log(`  Sample: ${p.sample.replace(/\s+/g, " ").slice(0, 300)}`);
          }
        }
      } else {
        console.log(`[zepto] extracted ${products.length} products`);
      }

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

      return { products: normalized, status: "ok" as const };
    },
    lat,
    lon,
  );
}
