import { formatPrice } from "@/lib/format";

export type TargetPriceResult =
  | { valid: true; value: number }
  | { valid: false; message: string };

export function parseTargetPriceDraft(
  draft: string,
  range?: { low: number; high: number },
): TargetPriceResult {
  if (draft.trim() === "") {
    return { valid: false, message: "Enter a target price." };
  }

  const parsed = Number(draft);

  if (!Number.isFinite(parsed)) {
    return { valid: false, message: "Enter a valid target price." };
  }

  const value = Number(parsed.toFixed(2));

  if (value < 0.01) {
    return {
      valid: false,
      message: "Target price must be at least $0.01.",
    };
  }

  if (range && (value < range.low || value > range.high)) {
    return {
      valid: false,
      message: `Choose a target between ${formatPrice(range.low)} and ${formatPrice(range.high)} for this analysis.`,
    };
  }

  return { valid: true, value };
}

export function formatTargetPriceDraft(value: number) {
  return String(Number(value.toFixed(2)));
}
