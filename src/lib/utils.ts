import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format all numbers to 2 decimal places consistently
export function formatNumber(num: number): string {
  return num.toFixed(2);
}

// Format numbers with commas and 2 decimal places
export function formatNumberWithCommas(num: number): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
