import { Badge } from "@/components/ui/badge";
import type { StrategyTemplateId } from "@/lib/options";
import { cn } from "@/lib/utils";

export type StrategyBias = "bullish" | "bearish" | "neutral";

export const STRATEGY_BIAS: Record<StrategyTemplateId, StrategyBias> = {
  "long-call": "bullish",
  "short-put": "bullish",
  "cash-secured-put": "bullish",
  "bull-call-spread": "bullish",
  "bull-put-spread": "bullish",
  "covered-call": "bullish",
  "long-put": "bearish",
  "short-call": "bearish",
  "bear-put-spread": "bearish",
  "bear-call-spread": "bearish",
  "iron-condor": "neutral",
  "short-straddle": "neutral",
  "short-strangle": "neutral",
};

export function BiasBadge({ bias }: { bias: StrategyBias }) {
  const className =
    bias === "bullish"
      ? "border-profit/30 bg-profit/10 text-profit"
      : bias === "bearish"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-border/60 bg-muted text-muted-foreground";

  return (
    <Badge variant="outline" className={cn("capitalize", className)}>
      {bias}
    </Badge>
  );
}
