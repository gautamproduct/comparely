// Shared types across scrapers, API routes, and UI

export type Platform = "blinkit" | "zepto" | "instamart";

export interface RawProduct {
  platform: Platform;
  id: string;            // Platform-specific product ID
  name: string;          // As shown on platform
  brand?: string;
  imageUrl?: string;
  price: number;         // Final price in INR
  mrp?: number;          // Original price before discount
  quantity: string;      // Raw quantity string e.g. "500 g", "1 L", "12 pcs"
  available: boolean;
  deepLink?: string;     // URL to open this product on the platform
}

export interface NormalizedProduct extends RawProduct {
  unit: "g" | "ml" | "pcs" | "unknown";
  unitValue: number;     // e.g. 500 for "500 g"
  pricePerUnit: number;  // price / unitValue (₹/g, ₹/ml, ₹/pc)
}

export interface MatchedProductGroup {
  groupKey: string;      // Canonical name used for matching
  displayName: string;   // Best display name across platforms
  brand?: string;
  imageUrl?: string;
  variants: {
    blinkit?: NormalizedProduct;
    zepto?: NormalizedProduct;
    instamart?: NormalizedProduct;
  };
  cheapestPlatform?: Platform;
  cheapestPricePerUnit?: number;
}

export interface SearchRequest {
  query: string;
  lat: number;
  lon: number;
}

export interface SearchResponse {
  query: string;
  location: { lat: number; lon: number };
  results: MatchedProductGroup[];
  platformStatus: {
    blinkit: "ok" | "error" | "not_serviceable";
    zepto: "ok" | "error" | "not_serviceable";
    instamart: "ok" | "error" | "not_serviceable";
  };
  cachedAt?: string;
}

export interface CartItem {
  groupKey: string;
  displayName: string;
  imageUrl?: string;
  variants: MatchedProductGroup["variants"];
  quantity: number;      // How many user wants
}

export interface CartTotals {
  blinkit: { total: number; itemsAvailable: number };
  zepto: { total: number; itemsAvailable: number };
  instamart: { total: number; itemsAvailable: number };
  cheapest: Platform | null;
  savings: number;       // Difference between cheapest and most expensive
}
