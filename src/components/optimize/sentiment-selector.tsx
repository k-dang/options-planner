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

type SentimentOption = {
  key: string;
  label: string;
  multiplier: number;
  icon: LucideIcon;
  buttonClassName: string;
};

export const SENTIMENTS = [
  {
    key: "very-bearish",
    label: "Very Bearish",
    multiplier: 0.85,
    icon: ArrowDown,
    buttonClassName:
      "border-[oklch(0.65_0.2_25/0.35)] text-[oklch(0.65_0.2_25)] hover:!bg-[oklch(0.65_0.2_25/0.12)] hover:!text-[oklch(0.65_0.2_25)] aria-pressed:border-[oklch(0.65_0.2_25)] aria-pressed:bg-[oklch(0.65_0.2_25/0.18)] aria-pressed:shadow-[0_0_12px_oklch(0.65_0.2_25/0.2)]",
  },
  {
    key: "bearish",
    label: "Bearish",
    multiplier: 0.93,
    icon: ArrowDownRight,
    buttonClassName:
      "border-[oklch(0.7_0.15_55/0.35)] text-[oklch(0.7_0.15_55)] hover:!bg-[oklch(0.7_0.15_55/0.12)] hover:!text-[oklch(0.7_0.15_55)] aria-pressed:border-[oklch(0.7_0.15_55)] aria-pressed:bg-[oklch(0.7_0.15_55/0.18)] aria-pressed:shadow-[0_0_12px_oklch(0.7_0.15_55/0.2)]",
  },
  {
    key: "neutral",
    label: "Neutral",
    multiplier: 1.0,
    icon: ArrowRight,
    buttonClassName:
      "border-[oklch(0.6_0.01_260/0.35)] text-[oklch(0.6_0.01_260)] hover:!bg-[oklch(0.6_0.01_260/0.12)] hover:!text-[oklch(0.6_0.01_260)] aria-pressed:border-[oklch(0.6_0.01_260)] aria-pressed:bg-[oklch(0.6_0.01_260/0.18)] aria-pressed:shadow-[0_0_12px_oklch(0.6_0.01_260/0.2)]",
  },
  {
    key: "directional",
    label: "Directional",
    multiplier: 1.05,
    icon: ArrowLeftRight,
    buttonClassName:
      "border-[oklch(0.65_0.2_300/0.35)] text-[oklch(0.65_0.2_300)] hover:!bg-[oklch(0.65_0.2_300/0.12)] hover:!text-[oklch(0.65_0.2_300)] aria-pressed:border-[oklch(0.65_0.2_300)] aria-pressed:bg-[oklch(0.65_0.2_300/0.18)] aria-pressed:shadow-[0_0_12px_oklch(0.65_0.2_300/0.2)]",
  },
  {
    key: "bullish",
    label: "Bullish",
    multiplier: 1.1,
    icon: ArrowUpRight,
    buttonClassName:
      "border-[oklch(0.72_0.19_155/0.35)] text-[oklch(0.72_0.19_155)] hover:!bg-[oklch(0.72_0.19_155/0.12)] hover:!text-[oklch(0.72_0.19_155)] aria-pressed:border-[oklch(0.72_0.19_155)] aria-pressed:bg-[oklch(0.72_0.19_155/0.18)] aria-pressed:shadow-[0_0_12px_oklch(0.72_0.19_155/0.2)]",
  },
  {
    key: "very-bullish",
    label: "Very Bullish",
    multiplier: 1.2,
    icon: ArrowUp,
    buttonClassName:
      "border-[oklch(0.8_0.22_145/0.35)] text-[oklch(0.8_0.22_145)] hover:!bg-[oklch(0.8_0.22_145/0.12)] hover:!text-[oklch(0.8_0.22_145)] aria-pressed:border-[oklch(0.8_0.22_145)] aria-pressed:bg-[oklch(0.8_0.22_145/0.18)] aria-pressed:shadow-[0_0_12px_oklch(0.8_0.22_145/0.2)]",
  },
] satisfies readonly SentimentOption[];

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
    <div className="grid w-full grid-cols-6 items-start justify-items-center gap-2">
      {SENTIMENTS.map((s) => {
        const isActive = sentiment === s.key;
        const Icon = s.icon;

        return (
          <div key={s.key} className="flex flex-col items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={`rounded-full p-8 transition-all ${s.buttonClassName}`}
              aria-pressed={isActive}
              aria-label={s.label}
              title={s.label}
              onClick={() =>
                onSentimentChange(
                  s.key,
                  Math.round(quotePrice * s.multiplier * 100) / 100,
                )
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={2.5} />
            </Button>
            <span className="text-center font-mono text-[0.55rem] uppercase tracking-wider text-muted-foreground">
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
