import {
  ArrowDown,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const SENTIMENTS = [
  {
    key: "very-bearish",
    label: "Very Bearish",
    multiplier: 0.85,
    color: "oklch(0.65 0.2 25)",
    icon: ArrowDown,
  },
  {
    key: "bearish",
    label: "Bearish",
    multiplier: 0.93,
    color: "oklch(0.7 0.15 55)",
    icon: ArrowDownRight,
  },
  {
    key: "neutral",
    label: "Neutral",
    multiplier: 1.0,
    color: "oklch(0.6 0.01 260)",
    icon: ArrowRight,
  },
  {
    key: "directional",
    label: "Directional",
    multiplier: 1.05,
    color: "oklch(0.65 0.2 300)",
    icon: ArrowLeftRight,
  },
  {
    key: "bullish",
    label: "Bullish",
    multiplier: 1.1,
    color: "oklch(0.72 0.19 155)",
    icon: ArrowUpRight,
  },
  {
    key: "very-bullish",
    label: "Very Bullish",
    multiplier: 1.2,
    color: "oklch(0.8 0.22 145)",
    icon: ArrowUp,
  },
] as const;

type SentimentIcon = LucideIcon;

type SentimentSelectorProps = {
  quotePrice: number;
  sentiment: string | null;
  onSentimentChange: (key: string, targetPrice: number) => void;
};

export function SentimentSelector({
  quotePrice,
  sentiment,
  onSentimentChange,
}: SentimentSelectorProps) {
  return (
    <div className="grid w-full grid-cols-6 items-end">
      {SENTIMENTS.map((s) => {
        const isActive = sentiment === s.key;
        const Icon = s.icon as SentimentIcon;

        return (
          <Button
            key={s.key}
            type="button"
            variant="ghost"
            className="h-auto w-full flex-col items-center gap-1.5 rounded-none px-0 py-0 hover:bg-transparent"
            aria-pressed={isActive}
            onClick={() =>
              onSentimentChange(
                s.key,
                Math.round(quotePrice * s.multiplier * 100) / 100,
              )
            }
          >
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full border transition-all sm:h-14 sm:w-14"
              style={{
                borderColor: isActive ? s.color : "oklch(1 0 0 / 0.08)",
                backgroundColor: isActive
                  ? `color-mix(in oklch, ${s.color} 15%, transparent)`
                  : "oklch(0.14 0.008 260)",
                boxShadow: isActive
                  ? `0 0 12px color-mix(in oklch, ${s.color} 25%, transparent)`
                  : "none",
                color: isActive ? s.color : "oklch(0.5 0.01 260)",
              }}
            >
              <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={2.5} />
            </span>
            <span
              className="font-mono text-[0.5rem] uppercase tracking-wider transition-colors sm:text-[0.55rem]"
              style={{
                color: isActive ? s.color : "oklch(0.45 0.01 260)",
              }}
            >
              {s.label}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
