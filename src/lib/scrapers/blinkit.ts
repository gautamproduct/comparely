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

      await page.goto("https://blinkit.com/", {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
      await page.waitForTimeout(1500);

      const searchUrl = `https://blinkit.com/s/?q=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(3000);

      const notServiceable = await page
        .locator("text=/not deliverable|not serviceable|coming soon/i")
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
          '[data-test-id*="plp-product"], [class*="ProductCard"], [class*="plp-product"], [role="button"][class*="product"]',
        );

        cards.forEach((card, i) => {
          const name =
            card.querySelector('[class*="Product__UpdatedTitle"], [class*="ProductName"], h4, h3')
              ?.textContent?.trim() || "";
          const priceText =
            card.querySelector('[class*="Product__UpdatedPriceAndAtc"], [class*="Price"]')
              ?.textContent?.trim() || "";
          const priceMatch = priceText.match(/₹\s*(\d+(?:\.\d+)?)/);
          const mrpMatch = priceText.match(/₹\s*(\d+(?:\.\d+)?)\s*₹\s*(\d+(?:\.\d+)?)/);
          const quantity =
            card.querySelector('[class*="Product__UpdatedQuantity"], [class*="Quantity"], [class*="Weight"]')
              ?.textContent?.trim() || "";
          const img = card.querySelector("img");
          const imageUrl = img?.getAttribute("src") || "";
          const id =
            card.getAttribute("data-test-id") ||
            card.getAttribute("id") ||
            `blinkit-${i}-${name.slice(0, 20)}`;
          const available = !card.textContent?.toLowerCase().includes("notify");

          if (name && priceMatch) {
            items.push({
              id,
              name,
              price: parseFloat(priceMatch[1]),
              mrp: mrpMatch ? parseFloat(mrpMatch[1]) : parseFloat(priceMatch[1]),
              quantity,
              imageUrl,
              available,
            });
          }
        });

        return items;
      });

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
