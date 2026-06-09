"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  variant?: "hero" | "compact";
}

export default function SearchBar({ value, onChange, onSubmit, disabled, variant = "hero" }: Props) {
  const isHero = variant === "hero";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) onSubmit();
      }}
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-[var(--bg-card)] border-[var(--border)] transition-all w-full",
        isHero ? "px-5 py-4" : "px-4 py-2.5",
        "focus-within:border-[var(--accent)]/50 focus-within:shadow-[0_0_0_4px_var(--accent-glow)]",
        disabled && "opacity-50",
      )}
    >
      <Search size={isHero ? 22 : 18} className="text-[var(--text-faint)] shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={
          disabled ? "Set your location first…" : 'Search for "amul butter", "onion", "maggi"…'
        }
        className={cn(
          "flex-1 bg-transparent outline-none placeholder:text-[var(--text-faint)] text-[var(--text)]",
          isHero ? "text-base" : "text-sm",
        )}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className={cn(
          "rounded-xl font-medium transition-all shrink-0",
          isHero ? "px-5 py-2.5 text-sm" : "px-3 py-1.5 text-xs",
          value.trim() && !disabled
            ? "bg-[var(--accent)] text-black hover:bg-emerald-400"
            : "bg-[var(--bg-elevated)] text-[var(--text-faint)] cursor-not-allowed",
        )}
      >
        Compare
      </button>
    </form>
  );
}
