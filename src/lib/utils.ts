import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupee(n: number): string {
  return `₹${n.toFixed(n % 1 === 0 ? 0 : 2)}`;
}

export function formatPerUnit(pricePerUnit: number, unit: string): string {
  if (unit === "unknown" || pricePerUnit === 0) return "—";
  if (unit === "g") return `₹${(pricePerUnit * 100).toFixed(2)}/100g`;
  if (unit === "ml") return `₹${(pricePerUnit * 100).toFixed(2)}/100ml`;
  if (unit === "pcs") return `₹${pricePerUnit.toFixed(2)}/pc`;
  return "—";
}

export const PLATFORM_META = {
  blinkit: { name: "Blinkit", color: "#F8CB46", accent: "#F8CB46" },
  zepto: { name: "Zepto", color: "#7C3AED", accent: "#7C3AED" },
  instamart: { name: "Instamart", color: "#FC8019", accent: "#FC8019" },
} as const;
