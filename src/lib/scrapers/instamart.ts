import { RawProduct } from "@/types";
import { withBrowser } from "../browser";

export async function scrapeInstamart(
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
          if (!/search|listing|product|widget/i.test(url)) return;
          const text = await response.text();
          if (text.includes("₹") || /price|mrp|store_price/i.test(text)) {
            apiPayloads.push({ url, sample: text.slice(0, 500) });
          }
        } catch {}
      });

      await page.addInitScript(({ lat, lon }) => {
        try {
          localStorage.setItem("userLocation", JSON.stringify({ lat, lng: lon }));
        } catch {}
      }, { lat, lon });

      await page.goto("https://www.swiggy.com/instamart", {
        waitUntil: "domcontentloaded",
        timeout: 25000,
      });
      await page.waitForTimeout(3000);

      const searchUrl = `https://www.swiggy.com/instamart/search?custom_back=true&query=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(2500);

      const pageTitle = await page.title();
      const pageUrl = page.url();
      console.log(`[instamart] page="${pageTitle}" url="${pageUrl}"`);

      const notServiceable = await page
        .locator("text=/not serviceable|coming soon|not available/i")
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
          '[data-testid*="ItemWidget"]',
          '[data-testid*="product"]',
          '[class*="ProductCard"]',
          '[class*="ItemCard"]',
          '[class*="_product"]',
          '[class*="item-card"]',
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
            card.querySelector('[data-testid*="ItemName"], h3, h4, [class*="ItemName"], [class*="Name"]')
              ?.textContent?.trim() || "";
          const quantity =
            card.querySelector('[data-testid*="ItemWidgetItemDescription"], [class*="Quantity"], [class*="weight"]')
              ?.textContent?.trim() || "";
          const img = card.querySelector("img");
          const imageUrl = img?.getAttribute("src") || "";
          const id = `instamart-${i}-${name.slice(0, 20)}`;

          if (name) {
            items.push({
              id,
              name,
              price: Math.min(...priceMatches),
              mrp: Math.max(...priceMatches),
              quantity,
              imageUrl,
              available: !text.toLowerCase().includes("notify"),
            });
          }
        });

        return items;
      });

      if (products.length === 0) {
        const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 500));
        console.log(`[instamart] 0 products. Body snippet:\n${bodySnippet}`);
        if (apiPayloads.length > 0) {
          console.log(`[instamart] captured ${apiPayloads.length} JSON API payloads:`);
          for (const p of apiPayloads.slice(0, 3)) {
            console.log(`  URL: ${p.url}`);
            console.log(`  Sample: ${p.sample.replace(/\s+/g, " ").slice(0, 300)}`);
          }
        }
      } else {
        console.log(`[instamart] extracted ${products.length} products`);
      }

      const normalized: RawProduct[] = products.slice(0, 20).map((p) => ({
        platform: "instamart" as const,
        id: p.id,
        name: p.name,
        imageUrl: p.imageUrl,
        price: p.price,
        mrp: p.mrp,
        quantity: p.quantity,
        available: p.available,
        deepLink: `https://www.swiggy.com/instamart/search?query=${encodeURIComponent(query)}`,
      }));

      return { products: normalized, status: "ok" as const };
    },
    lat,
    lon,
  );
}
