import { Badge } from "@/components/ui/badge";
import {
  type StrategyBias,
  type StrategyTemplateId,
  strategyTemplates,
} from "@/lib/options";
import { cn } from "@/lib/utils";

export type DisplayBias = Exclude<StrategyBias, "income">;

export const STRATEGY_BIAS = Object.fromEntries(
  strategyTemplates
    .all()
    .map((template) => [
      template.id,
      template.biases.find((bias): bias is DisplayBias => bias !== "income") ??
        "neutral",
    ]),
) as Record<StrategyTemplateId, DisplayBias>;

export function BiasBadge({ bias }: { bias: DisplayBias }) {
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
