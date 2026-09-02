import { Badge } from "@/components/ui/badge";
import type { DisplayBias } from "@/lib/strategy-bias";
import { cn } from "@/lib/utils";

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
