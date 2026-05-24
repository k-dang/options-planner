import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function singleValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export function isPositiveNumber(value: number) {
  return Number.isFinite(value) && value > 0;
}

export function parsePositiveNumber(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return isPositiveNumber(parsed) ? parsed : undefined;
}
