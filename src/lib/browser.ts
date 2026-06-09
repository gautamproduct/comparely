// Per-request Playwright browser. Launches a fresh Chromium per scrape,
// closes it after. Trades a few extra seconds for predictable RAM usage —
// critical on Railway's 512MB free tier.

import { Browser, BrowserContext, chromium } from "playwright";

export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--single-process",        // Critical for low-RAM envs
      "--no-zygote",
      "--disable-accelerated-2d-canvas",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
    ],
  });
}

export async function newContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    viewport: { width: 390, height: 844 },
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
    // Block images/fonts/media — we only need DOM text
    javaScriptEnabled: true,
  });
}

export async function setLocation(context: BrowserContext, lat: number, lon: number) {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: lat, longitude: lon });
}

// Wrap a scraper to always launch + close browser around it.
export async function withBrowser<T>(
  fn: (ctx: BrowserContext) => Promise<T>,
  lat: number,
  lon: number,
): Promise<T> {
  const browser = await launchBrowser();
  try {
    const context = await newContext(browser);
    await setLocation(context, lat, lon);
    // Block heavy resources to save RAM and time
    await context.route("**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,mp4,webm}", (route) =>
      route.abort(),
    );
    return await fn(context);
  } finally {
    await browser.close().catch(() => {});
  }
}
