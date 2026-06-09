// Fuzzy match products across platforms.
// Strategy: tokenize names, remove stopwords, compute Jaccard similarity on token sets,
// require unit + unit value to match exactly.

import { MatchedProductGroup, NormalizedProduct, Platform } from "@/types";

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "with", "for", "pack",
  "size", "fresh", "natural", "pure", "premium", "best", "new",
]);

function tokenize(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOPWORDS.has(t)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

const SIMILARITY_THRESHOLD = 0.4;

interface Candidate {
  product: NormalizedProduct;
  tokens: Set<string>;
}

export function matchProducts(
  byPlatform: { blinkit: NormalizedProduct[]; zepto: NormalizedProduct[]; instamart: NormalizedProduct[] },
): MatchedProductGroup[] {
  // Prepare candidates per platform
  const candidates: Record<Platform, Candidate[]> = {
    blinkit: byPlatform.blinkit.map((p) => ({ product: p, tokens: tokenize(p.name) })),
    zepto: byPlatform.zepto.map((p) => ({ product: p, tokens: tokenize(p.name) })),
    instamart: byPlatform.instamart.map((p) => ({ product: p, tokens: tokenize(p.name) })),
  };

  // Seed groups from whichever platform returned the most results.
  const platforms: Platform[] = ["blinkit", "zepto", "instamart"];
  platforms.sort((a, b) => candidates[b].length - candidates[a].length);

  const used: Record<Platform, Set<string>> = {
    blinkit: new Set(),
    zepto: new Set(),
    instamart: new Set(),
  };

  const groups: MatchedProductGroup[] = [];

  for (const seed of candidates[platforms[0]]) {
    if (used[platforms[0]].has(seed.product.id)) continue;

    const group: MatchedProductGroup = {
      groupKey: [...seed.tokens].sort().join("-"),
      displayName: seed.product.name,
      brand: seed.product.brand,
      imageUrl: seed.product.imageUrl,
      variants: { [platforms[0]]: seed.product } as MatchedProductGroup["variants"],
    };
    used[platforms[0]].add(seed.product.id);

    // Try to find a match in the other two platforms
    for (const other of platforms.slice(1)) {
      let best: Candidate | null = null;
      let bestScore = SIMILARITY_THRESHOLD;
      for (const cand of candidates[other]) {
        if (used[other].has(cand.product.id)) continue;
        // Must share unit + unitValue (avoid matching 500g to 1kg)
        if (
          cand.product.unit !== seed.product.unit ||
          cand.product.unitValue !== seed.product.unitValue
        ) {
          continue;
        }
        const score = jaccard(seed.tokens, cand.tokens);
        if (score > bestScore) {
          bestScore = score;
          best = cand;
        }
      }
      if (best) {
        group.variants[other] = best.product;
        used[other].add(best.product.id);
        if (!group.imageUrl) group.imageUrl = best.product.imageUrl;
      }
    }

    // Compute cheapest
    let cheapest: Platform | null = null;
    let cheapestPpu = Infinity;
    for (const p of platforms) {
      const variant = group.variants[p];
      if (variant && variant.available && variant.pricePerUnit < cheapestPpu) {
        cheapest = p;
        cheapestPpu = variant.pricePerUnit;
      }
    }
    if (cheapest) {
      group.cheapestPlatform = cheapest;
      group.cheapestPricePerUnit = cheapestPpu;
    }

    groups.push(group);
  }

  // Add unmatched items from other platforms as standalone groups
  for (const p of platforms.slice(1)) {
    for (const cand of candidates[p]) {
      if (used[p].has(cand.product.id)) continue;
      groups.push({
        groupKey: [...cand.tokens].sort().join("-"),
        displayName: cand.product.name,
        brand: cand.product.brand,
        imageUrl: cand.product.imageUrl,
        variants: { [p]: cand.product } as MatchedProductGroup["variants"],
        cheapestPlatform: cand.product.available ? p : undefined,
        cheapestPricePerUnit: cand.product.available ? cand.product.pricePerUnit : undefined,
      });
    }
  }

  return groups;
}
