"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, Zap, AlertCircle } from "lucide-react";
import LocationPicker, { Location } from "@/components/LocationPicker";
import SearchBar from "@/components/SearchBar";
import ResultCard from "@/components/ResultCard";
import CartDrawer from "@/components/CartDrawer";
import { CartItem, MatchedProductGroup, SearchResponse } from "@/types";
import { PLATFORM_META } from "@/lib/utils";

const STORAGE_LOCATION = "comparely:location";
const STORAGE_CART = "comparely:cart";

export default function HomePage() {
  const [location, setLocation] = useState<Location | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MatchedProductGroup[] | null>(null);
  const [platformStatus, setPlatformStatus] = useState<SearchResponse["platformStatus"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    try {
      const loc = localStorage.getItem(STORAGE_LOCATION);
      if (loc) setLocation(JSON.parse(loc));
      const c = localStorage.getItem(STORAGE_CART);
      if (c) setCart(JSON.parse(c));
    } catch {}
  }, []);

  useEffect(() => {
    if (location) localStorage.setItem(STORAGE_LOCATION, JSON.stringify(location));
  }, [location]);

  useEffect(() => {
    localStorage.setItem(STORAGE_CART, JSON.stringify(cart));
  }, [cart]);

  async function handleSearch() {
    if (!location || !query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), lat: location.lat, lon: location.lon }),
      });
      if (!res.ok) throw new Error("Search failed");
      const data: SearchResponse = await res.json();
      setResults(data.results);
      setPlatformStatus(data.platformStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  function addToCart(group: MatchedProductGroup) {
    setCart((prev) => {
      const existing = prev.find((c) => c.groupKey === group.groupKey);
      if (existing) {
        return prev.map((c) =>
          c.groupKey === group.groupKey ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [
        ...prev,
        {
          groupKey: group.groupKey,
          displayName: group.displayName,
          imageUrl: group.imageUrl,
          variants: group.variants,
          quantity: 1,
        },
      ];
    });
  }

  function removeFromCart(groupKey: string) {
    setCart((prev) => {
      const existing = prev.find((c) => c.groupKey === groupKey);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter((c) => c.groupKey !== groupKey);
      return prev.map((c) =>
        c.groupKey === groupKey ? { ...c, quantity: c.quantity - 1 } : c,
      );
    });
  }

  function incrementFromCart(groupKey: string) {
    setCart((prev) =>
      prev.map((c) => (c.groupKey === groupKey ? { ...c, quantity: c.quantity + 1 } : c)),
    );
  }

  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const hasSearched = results !== null;

  return (
    <main className="flex-1 flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[var(--bg)]/80 border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <button
            onClick={() => {
              setResults(null);
              setQuery("");
            }}
            className="flex items-center gap-2 font-bold text-lg"
          >
            <span className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <Zap size={16} className="text-black" fill="currentColor" />
            </span>
            <span>Comparely</span>
          </button>

          {hasSearched && (
            <div className="hidden md:block flex-1 max-w-md">
              <LocationPicker value={location} onChange={setLocation} variant="compact" />
            </div>
          )}

          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)]/40 rounded-xl text-sm font-medium transition-all"
          >
            <ShoppingCart size={16} />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 bg-[var(--accent)] text-black text-[11px] font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {!hasSearched && (
        <section className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-2xl mx-auto fade-in">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-full text-xs text-[var(--text-dim)] mb-6">
                <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse" />
                Live prices from 3 platforms
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-4">
                Stop guessing which app
                <br />
                has the cheaper{" "}
                <span className="text-[var(--accent)]">groceries</span>.
              </h1>
              <p className="text-[var(--text-dim)] text-lg max-w-xl mx-auto">
                Real-time price comparison across Blinkit, Zepto, and Instamart — with per-unit
                pricing so you know what's actually the best deal.
              </p>
            </div>

            <div className="space-y-3">
              <LocationPicker value={location} onChange={setLocation} />
              <SearchBar
                value={query}
                onChange={setQuery}
                onSubmit={handleSearch}
                disabled={!location}
              />
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-[var(--text-faint)]">
              {(["blinkit", "zepto", "instamart"] as const).map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: PLATFORM_META[p].color }} />
                  <span>{PLATFORM_META[p].name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {hasSearched && (
        <section className="flex-1 max-w-6xl mx-auto w-full px-6 py-6">
          <div className="md:hidden mb-4">
            <LocationPicker value={location} onChange={setLocation} variant="compact" />
          </div>
          <div className="mb-6">
            <SearchBar
              value={query}
              onChange={setQuery}
              onSubmit={handleSearch}
              disabled={!location || loading}
              variant="compact"
            />
          </div>

          {platformStatus && (
            <div className="mb-4 flex flex-wrap gap-2">
              {(["blinkit", "zepto", "instamart"] as const).map((p) => (
                <PlatformStatusChip key={p} platform={p} status={platformStatus[p]} />
              ))}
            </div>
          )}

          {loading && (
            <div className="grid sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="shimmer rounded-2xl h-48" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <AlertCircle size={18} />
              <span>{error}. Try again.</span>
            </div>
          )}

          {!loading && results && results.length === 0 && (
            <div className="text-center py-16 text-[var(--text-faint)]">
              <p>No results found. Try a different search term.</p>
            </div>
          )}

          {!loading && results && results.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4">
              {results.map((group) => {
                const cartItem = cart.find((c) => c.groupKey === group.groupKey);
                return (
                  <ResultCard
                    key={group.groupKey}
                    group={group}
                    cartQuantity={cartItem?.quantity || 0}
                    onAdd={() => addToCart(group)}
                    onRemove={() => removeFromCart(group.groupKey)}
                  />
                );
              })}
            </div>
          )}
        </section>
      )}

      <footer className="border-t border-[var(--border)] py-6 px-6 text-center text-xs text-[var(--text-faint)]">
        Prices update every 15 minutes. Comparely is not affiliated with Blinkit, Zepto, or Instamart.
      </footer>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onIncrement={incrementFromCart}
        onDecrement={removeFromCart}
      />
    </main>
  );
}

function PlatformStatusChip({
  platform,
  status,
}: {
  platform: "blinkit" | "zepto" | "instamart";
  status: "ok" | "error" | "not_serviceable";
}) {
  const meta = PLATFORM_META[platform];
  const dot =
    status === "ok" ? "bg-[var(--accent)]" : status === "not_serviceable" ? "bg-yellow-500" : "bg-red-500";
  const label =
    status === "ok" ? "Live" : status === "not_serviceable" ? "Not serviceable" : "Error";
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-full text-xs">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
      <span className="text-[var(--text-dim)]">{meta.name}</span>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="text-[var(--text-faint)]">{label}</span>
    </div>
  );
}
