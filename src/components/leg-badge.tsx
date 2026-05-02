import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import type { OptionLeg } from "@/lib/options";

export function LegBadge({ leg }: { leg: OptionLeg }) {
  const action = leg.side === "long" ? "Buy" : "Sell";

  return (
    <Badge
      variant={leg.side === "long" ? "outline" : "destructive"}
      className={
        leg.side === "long"
          ? "border-primary/25 bg-primary/10 text-primary"
          : undefined
      }
    >
      <span className="font-semibold uppercase">{action}</span>
      <span>
        {formatCurrency(leg.strike)} {leg.optionType}
      </span>
    </Badge>
  );
}
