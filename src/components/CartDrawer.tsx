"use client";

import { useMemo } from "react";
import { ShoppingCart, X, Trophy, ExternalLink } from "lucide-react";
import { CartItem, CartTotals, Platform } from "@/types";
import { cn, formatRupee, PLATFORM_META } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onIncrement: (key: string) => void;
  onDecrement: (key: string) => void;
}

export default function CartDrawer({ open, onClose, items, onIncrement, onDecrement }: Props) {
  const totals = useMemo(() => computeTotals(items), [items]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 fade-in"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed top-0 right-0 h-full w-full max-w-md bg-[var(--bg)] border-l border-[var(--border)] z-50 transform transition-transform duration-300 flex flex-col",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <ShoppingCart size={20} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Your Cart</h2>
            <span className="text-sm text-[var(--text-faint)]">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-colors"
            aria-label="Close cart"
          >
            <X size={18} className="text-[var(--text-dim)]" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <ShoppingCart size={48} className="text-[var(--text-faint)] mb-4" />
            <p className="text-[var(--text-dim)] mb-1">Your cart is empty</p>
            <p className="text-sm text-[var(--text-faint)]">
              Search for products and add them to compare totals
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {items.map((item) => (
                <CartRow
                  key={item.groupKey}
                  item={item}
                  onIncrement={() => onIncrement(item.groupKey)}
                  onDecrement={() => onDecrement(item.groupKey)}
                />
              ))}
            </div>

            <div className="px-6 py-5 border-t border-[var(--border)] bg-[var(--bg-elevated)]">
              <div className="text-xs uppercase tracking-wider text-[var(--text-faint)] mb-3">
                Total per platform
              </div>
              <div className="space-y-2">
                {(["blinkit", "zepto", "instamart"] as Platform[]).map((p) => (
                  <PlatformTotalRow
                    key={p}
                    platform={p}
                    total={totals[p].total}
                    itemsAvailable={totals[p].itemsAvailable}
                    totalItems={items.length}
                    isCheapest={totals.cheapest === p}
                  />
                ))}
              </div>
              {totals.cheapest && totals.savings > 0 && (
                <div className="mt-4 p-3 bg-[var(--accent-glow)] border border-[var(--accent)]/40 rounded-xl flex items-center gap-2">
                  <Trophy size={16} className="text-[var(--accent)]" />
                  <span className="text-sm font-medium text-[var(--text)]">
                    Save {formatRupee(totals.savings)} on {PLATFORM_META[totals.cheapest].name}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function CartRow({
  item,
  onIncrement,
  onDecrement,
}: {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="flex gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-[var(--bg-elevated)] shrink-0">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.displayName} className="w-full h-full object-cover" />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium line-clamp-2 leading-snug">{item.displayName}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onDecrement}
          className="w-7 h-7 rounded-md bg-[var(--bg-elevated)] hover:bg-[var(--border)] flex items-center justify-center text-[var(--text-dim)]"
        >
          −
        </button>
        <span className="text-sm font-medium min-w-[20px] text-center">{item.quantity}</span>
        <button
          onClick={onIncrement}
          className="w-7 h-7 rounded-md bg-[var(--bg-elevated)] hover:bg-[var(--border)] flex items-center justify-center text-[var(--text-dim)]"
        >
          +
        </button>
      </div>
    </div>
  );
}

function PlatformTotalRow({
  platform,
  total,
  itemsAvailable,
  totalItems,
  isCheapest,
}: {
  platform: Platform;
  total: number;
  itemsAvailable: number;
  totalItems: number;
  isCheapest: boolean;
}) {
  const meta = PLATFORM_META[platform];
  const url = {
    blinkit: "https://blinkit.com/",
    zepto: "https://www.zeptonow.com/",
    instamart: "https://www.swiggy.com/instamart",
  }[platform];
  const missing = totalItems - itemsAvailable;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex items-center justify-between p-3 rounded-xl border transition-all",
        isCheapest
          ? "border-[var(--accent)] bg-[var(--accent-glow)]"
          : "border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--text-faint)]",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-8 rounded-full" style={{ background: meta.color }} />
        <div>
          <div className="text-sm font-medium">{meta.name}</div>
          {missing > 0 && (
            <div className="text-[11px] text-[var(--text-faint)]">
              {missing} item{missing > 1 ? "s" : ""} unavailable
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <div className={cn("font-bold text-base", isCheapest && "text-[var(--accent)]")}>
            {itemsAvailable > 0 ? formatRupee(total) : "—"}
          </div>
        </div>
        <ExternalLink size={14} className="text-[var(--text-faint)] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </a>
  );
}

function computeTotals(items: CartItem[]): CartTotals {
  const platforms: Platform[] = ["blinkit", "zepto", "instamart"];
  const result = {
    blinkit: { total: 0, itemsAvailable: 0 },
    zepto: { total: 0, itemsAvailable: 0 },
    instamart: { total: 0, itemsAvailable: 0 },
  } as CartTotals;

  for (const item of items) {
    for (const p of platforms) {
      const v = item.variants[p];
      if (v && v.available) {
        result[p].total += v.price * item.quantity;
        result[p].itemsAvailable += 1;
      }
    }
  }

  let cheapest: Platform | null = null;
  let min = Infinity;
  let max = -Infinity;
  for (const p of platforms) {
    if (result[p].itemsAvailable === items.length && result[p].total > 0) {
      if (result[p].total < min) {
        min = result[p].total;
        cheapest = p;
      }
      if (result[p].total > max) max = result[p].total;
    }
  }
  result.cheapest = cheapest;
  result.savings = cheapest && max > min ? max - min : 0;
  return result;
}
