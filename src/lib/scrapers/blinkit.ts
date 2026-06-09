import { RawProduct } from "@/types";
import { withBrowser } from "../browser";

export async function scrapeBlinkit(
  query: string,
  lat: number,
  lon: number,
): Promise<{ products: RawProduct[]; status: "ok" | "error" | "not_serviceable" }> {
  return withBrowser(
    async (context) => {
      const page = await context.newPage();

      // Stealth: hide webdriver flag
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      });

      // Intercept JSON responses that might contain product data
      const apiPayloads: Array<{ url: string; sample: string }> = [];
      page.on("response", async (response) => {
        try {
          const url = response.url();
          const ct = response.headers()["content-type"] || "";
          if (!ct.includes("application/json")) return;
          if (!/search|product|listing|catalog|layout/i.test(url)) return;
          const text = await response.text();
          if (text.includes("₹") || /price|mrp/i.test(text)) {
            apiPayloads.push({ url, sample: text.slice(0, 500) });
          }
        } catch {}
      });

      await page.goto("https://blinkit.com/", {
        waitUntil: "domcontentloaded",
        timeout: 25000,
      });
      await page.waitForTimeout(2000);

      const searchUrl = `https://blinkit.com/s/?q=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(2000);

      const pageTitle = await page.title();
      const pageUrl = page.url();
      console.log(`[blinkit] page="${pageTitle}" url="${pageUrl}"`);

      const notServiceable = await page
        .locator("text=/not deliverable|not serviceable|coming soon/i")
        .first()
        .isVisible()
        .catch(() => false);
      if (notServiceable) {
        console.log(`[blinkit] not serviceable for lat=${lat} lon=${lon}`);
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

        // Very broad — try many selectors
        const cardSelectors = [
          '[data-test-id*="product"]',
          '[data-pf-id*="product"]',
          '[class*="ProductCard"]',
          '[class*="product-card"]',
          '[class*="plp-product"]',
          '[class*="ProductListing"]',
          'a[href*="/prn/"]',
          'a[href*="/cn/"]',
        ];
        const cards = new Set<Element>();
        cardSelectors.forEach((sel) => {
          document.querySelectorAll(sel).forEach((el) => cards.add(el));
        });

        cards.forEach((card, i) => {
          const text = card.textContent || "";
          const priceMatches = [...text.matchAll(/₹\s*(\d+(?:\.\d+)?)/g)].map((m) =>
            parseFloat(m[1]),
          );
          if (priceMatches.length === 0) return;

          const name =
            card.querySelector('[class*="Title"], [class*="Name"], h3, h4, h5, p[class*="name"]')
              ?.textContent?.trim() || "";
          const quantity =
            card.querySelector('[class*="Quantity"], [class*="Weight"], [class*="weight"], [class*="size"]')
              ?.textContent?.trim() || "";
          const img = card.querySelector("img");
          const imageUrl = img?.getAttribute("src") || "";
          const id = `blinkit-${i}-${name.slice(0, 20) || Math.random()}`;

          if (name && priceMatches.length > 0) {
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
        // Diagnostic dump — only on failure
        const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 500));
        console.log(`[blinkit] 0 products. Body snippet:\n${bodySnippet}`);
        if (apiPayloads.length > 0) {
          console.log(`[blinkit] captured ${apiPayloads.length} JSON API payloads:`);
          for (const p of apiPayloads.slice(0, 3)) {
            console.log(`  URL: ${p.url}`);
            console.log(`  Sample: ${p.sample.replace(/\s+/g, " ").slice(0, 300)}`);
          }
        }
      } else {
        console.log(`[blinkit] extracted ${products.length} products`);
      }

      const normalized: RawProduct[] = products.slice(0, 20).map((p) => ({
        platform: "blinkit" as const,
        id: p.id,
        name: p.name,
        imageUrl: p.imageUrl,
        price: p.price,
        mrp: p.mrp,
        quantity: p.quantity,
        available: p.available,
        deepLink: `https://blinkit.com/s/?q=${encodeURIComponent(query)}`,
      }));

      return { products: normalized, status: "ok" as const };
    },
    lat,
    lon,
  );
}
