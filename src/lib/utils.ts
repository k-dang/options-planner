import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function singleValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
