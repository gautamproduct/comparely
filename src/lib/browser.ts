// Shared Playwright browser instance to avoid re-launching Chromium per request.

import { Browser, BrowserContext, chromium } from "playwright";

let browserPromise: Promise<Browser> | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
      ],
    });
  }
  return browserPromise;
}

export async function newContext(): Promise<BrowserContext> {
  const browser = await getBrowser();
  return browser.newContext({
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    viewport: { width: 390, height: 844 },
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
  });
}

// Set location via CDP geolocation override
export async function setLocation(context: BrowserContext, lat: number, lon: number) {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: lat, longitude: lon });
}
