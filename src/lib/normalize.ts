// Normalize raw products from scrapers into a comparable shape.
// Extracts unit (g, ml, pcs) and computes price-per-unit.

import { NormalizedProduct, RawProduct } from "@/types";

const UNIT_PATTERNS: { regex: RegExp; unit: "g" | "ml" | "pcs"; multiplier: number }[] = [
  // Kilograms → grams
  { regex: /(\d+(?:\.\d+)?)\s*kg/i, unit: "g", multiplier: 1000 },
  // Grams
  { regex: /(\d+(?:\.\d+)?)\s*g(?:ms?|rams?)?\b/i, unit: "g", multiplier: 1 },
  // Liters → ml
  { regex: /(\d+(?:\.\d+)?)\s*l(?:tr|iters?)?\b/i, unit: "ml", multiplier: 1000 },
  // Milliliters
  { regex: /(\d+(?:\.\d+)?)\s*ml/i, unit: "ml", multiplier: 1 },
  // Pieces
  { regex: /(\d+)\s*(?:pcs?|pieces?|units?|nos?|count)\b/i, unit: "pcs", multiplier: 1 },
  // "Pack of N"
  { regex: /pack\s*of\s*(\d+)/i, unit: "pcs", multiplier: 1 },
  // Plain "x N"
  { regex: /\bx\s*(\d+)\b/i, unit: "pcs", multiplier: 1 },
];

export function extractUnit(quantity: string): {
  unit: "g" | "ml" | "pcs" | "unknown";
  unitValue: number;
} {
  if (!quantity) return { unit: "unknown", unitValue: 0 };
  for (const pat of UNIT_PATTERNS) {
    const m = quantity.match(pat.regex);
    if (m) {
      const value = parseFloat(m[1]) * pat.multiplier;
      return { unit: pat.unit, unitValue: value };
    }
  }
  return { unit: "unknown", unitValue: 0 };
}

export function normalize(raw: RawProduct): NormalizedProduct {
  const { unit, unitValue } = extractUnit(raw.quantity);
  const pricePerUnit = unitValue > 0 ? raw.price / unitValue : raw.price;
  return { ...raw, unit, unitValue, pricePerUnit };
}
