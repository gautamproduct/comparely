"use client";

import { Plus, Minus, ExternalLink, Sparkles } from "lucide-react";
import { MatchedProductGroup, Platform } from "@/types";
import { cn, formatPerUnit, formatRupee, PLATFORM_META } from "@/lib/utils";

interface Props {
  group: MatchedProductGroup;
  cartQuantity: number;
  onAdd: () => void;
  onRemove: () => void;
}

export default function ResultCard({ group, cartQuantity, onAdd, onRemove }: Props) {
  const platforms: Platform[] = ["blinkit", "zepto", "instamart"];
  const variants = platforms.map((p) => ({ platform: p, variant: group.variants[p] }));

  return (
    <article className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 hover:border-[var(--accent)]/30 transition-all fade-in">
      <div className="flex gap-4">
        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[var(--bg-elevated)] shrink-0">
          {group.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={group.imageUrl}
              alt={group.displayName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--text-faint)] text-xs">
              No image
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-[var(--text)] text-sm line-clamp-2 leading-snug">
            {group.displayName}
          </h3>
          {group.cheapestPlatform && group.cheapestPricePerUnit !== undefined && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <Sparkles size={12} className="text-[var(--accent)]" />
              <span className="text-xs font-semibold text-[var(--accent)]">
                Cheapest on {PLATFORM_META[group.cheapestPlatform].name}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {cartQuantity > 0 ? (
            <div className="flex items-center gap-2 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] px-1">
              <button
                onClick={onRemove}
                className="p-1.5 hover:bg-[var(--bg-card)] rounded transition-colors"
                aria-label="Decrease"
              >
                <Minus size={14} className="text-[var(--text-dim)]" />
              </button>
              <span className="text-sm font-medium text-[var(--text)] min-w-[16px] text-center">
                {cartQuantity}
              </span>
              <button
                onClick={onAdd}
                className="p-1.5 hover:bg-[var(--bg-card)] rounded transition-colors"
                aria-label="Increase"
              >
                <Plus size={14} className="text-[var(--text-dim)]" />
              </button>
            </div>
          ) : (
            <button
              onClick={onAdd}
              className="px-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] rounded-lg text-xs font-medium transition-all"
            >
              + Add
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {variants.map(({ platform, variant }) => (
          <PlatformPrice
            key={platform}
            platform={platform}
            variant={variant}
            isCheapest={group.cheapestPlatform === platform}
          />
        ))}
      </div>
    </article>
  );
}

function PlatformPrice({
  platform,
  variant,
  isCheapest,
}: {
  platform: Platform;
  variant?: import("@/types").NormalizedProduct;
  isCheapest: boolean;
}) {
  const meta = PLATFORM_META[platform];

  if (!variant) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] p-3 flex flex-col gap-1 opacity-50">
        <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: meta.color }}>
          {meta.name}
        </div>
        <div className="text-xs text-[var(--text-faint)]">Not available</div>
      </div>
    );
  }

  if (!variant.available) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-3 flex flex-col gap-1 opacity-60">
        <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: meta.color }}>
          {meta.name}
        </div>
        <div className="text-xs text-[var(--text-faint)]">Out of stock</div>
      </div>
    );
  }

  return (
    <a
      href={variant.deepLink}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group rounded-xl border p-3 flex flex-col gap-1 transition-all relative",
        isCheapest
          ? "border-[var(--accent)] bg-[var(--accent-glow)]"
          : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--text-faint)]",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: meta.color }}>
          {meta.name}
        </div>
        <ExternalLink size={10} className="text-[var(--text-faint)] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="font-bold text-[var(--text)] text-base leading-none">
        {formatRupee(variant.price)}
      </div>
      <div className="text-[11px] text-[var(--text-faint)]">
        {variant.quantity || "—"}
      </div>
      <div className={cn("text-[11px] font-medium mt-0.5", isCheapest ? "text-[var(--accent)]" : "text-[var(--text-dim)]")}>
        {formatPerUnit(variant.pricePerUnit, variant.unit)}
      </div>
    </a>
  );
}
