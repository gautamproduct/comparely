"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Location {
  label: string;
  lat: number;
  lon: number;
}

interface Props {
  value: Location | null;
  onChange: (loc: Location) => void;
  variant?: "hero" | "compact";
}

export default function LocationPicker({ value, onChange, variant = "hero" }: Props) {
  const [input, setInput] = useState(value?.label || "");
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (input.length < 3 || input === value?.label) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(input)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [input, value?.label]);

  const isHero = variant === "hero";

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border transition-all",
          isHero
            ? "bg-[var(--bg-card)] border-[var(--border)] px-5 py-4 focus-within:border-[var(--accent)]/50 focus-within:shadow-[0_0_0_4px_var(--accent-glow)]"
            : "bg-[var(--bg-elevated)] border-[var(--border)] px-4 py-2.5 text-sm",
        )}
      >
        <MapPin
          size={isHero ? 22 : 18}
          className={cn(value ? "text-[var(--accent)]" : "text-[var(--text-faint)]", "shrink-0")}
        />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Enter your area, e.g. Koramangala, Bangalore"
          className={cn(
            "flex-1 bg-transparent outline-none placeholder:text-[var(--text-faint)] text-[var(--text)]",
            isHero ? "text-base" : "text-sm",
          )}
        />
        {loading && <Loader2 size={18} className="text-[var(--text-faint)] animate-spin shrink-0" />}
        {value && !loading && input === value.label && (
          <Check size={18} className="text-[var(--accent)] shrink-0" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden z-50 fade-in">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                onChange(s);
                setInput(s.label);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors border-b border-[var(--border)] last:border-b-0 flex items-start gap-3"
            >
              <MapPin size={16} className="text-[var(--text-faint)] mt-1 shrink-0" />
              <span className="text-sm text-[var(--text)] line-clamp-2">{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
