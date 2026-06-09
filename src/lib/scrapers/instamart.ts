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

      await page.addInitScript(({ lat, lon }) => {
        try {
          localStorage.setItem("userLocation", JSON.stringify({ lat, lng: lon }));
        } catch {}
      }, { lat, lon });

      await page.goto("https://www.swiggy.com/instamart", {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
      await page.waitForTimeout(2500);

      const searchUrl = `https://www.swiggy.com/instamart/search?custom_back=true&query=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(3500);

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

        const cards = document.querySelectorAll(
          '[data-testid*="ItemWidgetContainer"], [data-testid*="product"], [class*="ProductCard"], [class*="ItemCard"]',
        );

        cards.forEach((card, i) => {
          const nameEl =
            card.querySelector('[data-testid*="ItemWidgetItemName"]') ||
            card.querySelector("h3") ||
            card.querySelector("h4") ||
            card.querySelector('[class*="ItemName"]');
          const name = nameEl?.textContent?.trim() || "";

          const text = card.textContent || "";
          const allPrices = [...text.matchAll(/₹\s*(\d+(?:\.\d+)?)/g)].map((m) =>
            parseFloat(m[1]),
          );

          const quantityEl =
            card.querySelector('[data-testid*="ItemWidgetItemDescription"]') ||
            card.querySelector('[class*="Quantity"]') ||
            card.querySelector('[class*="weight"]');
          const quantity = quantityEl?.textContent?.trim() || "";

          const img = card.querySelector("img");
          const imageUrl = img?.getAttribute("src") || "";
          const id = `instamart-${i}-${name.slice(0, 20)}`;
          const available = !text.toLowerCase().includes("notify");

          if (name && allPrices.length > 0) {
            items.push({
              id,
              name,
              price: Math.min(...allPrices),
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
