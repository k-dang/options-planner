import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { LegBadge } from "@/components/leg-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { formatCurrency, formatPercent, formatPrice } from "@/lib/format";
import type { OptimizerCandidate } from "@/lib/options";
import { cn } from "@/lib/utils";

const EXPIRATION_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

export function StrategyCard({
  candidate,
  featured = false,
}: {
  candidate: OptimizerCandidate;
  featured?: boolean;
}) {
  const maxLoss = candidate.summary.maxLoss;
  const returnOnRisk = candidate.summary.returnOnRisk;
  const optionLegs = candidate.state.legs.filter(
    (leg) => leg.kind === "option",
  );
  const title = titleCase(candidate.summary.strategyLabel);
  const hasUnlimitedRisk = maxLoss === null;
  const returnLabel = hasUnlimitedRisk
    ? "Return/risk unavailable"
    : candidate.summary.returnProfitBasisLabel === "target-profit"
      ? "Target return/risk"
      : "Return on risk";
  const returnTone =
    returnOnRisk === null
      ? "text-muted-foreground"
      : returnOnRisk < 0
        ? "text-destructive"
        : returnOnRisk >= 0.25
          ? "text-profit"
          : "text-foreground";
  const cardHeadingId = `strategy-${candidate.id}`;

  return (
    <Card
      aria-labelledby={cardHeadingId}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl bg-card shadow-none ring-1",
        featured ? "ring-primary/35" : "ring-border",
      )}
    >
      <CardHeader
        className={cn("pb-3", featured ? "text-left" : "text-center")}
      >
        <h3
          className={cn("font-semibold", featured ? "text-xl" : "text-base")}
          id={cardHeadingId}
        >
          {title}
        </h3>
        <div
          className={cn(
            "mt-1.5 flex flex-wrap gap-1",
            featured ? "justify-start" : "justify-center",
          )}
        >
          {optionLegs.map((leg) => (
            <LegBadge
              key={`${leg.optionType}-${leg.side}-${leg.strike}-${leg.expiration}`}
              leg={leg}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent
        className={cn(
          "flex flex-1 flex-col gap-4",
          featured &&
            "lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(380px,1.2fr)] lg:items-start lg:gap-6",
        )}
      >
        <div className="space-y-4">
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/30 px-4 py-3">
            <div>
              <p
                className={cn(
                  "font-mono text-2xl font-bold tabular-nums leading-none",
                  returnTone,
                )}
              >
                {formatPercent(returnOnRisk)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {returnLabel}
              </p>
              <p className="mt-2 text-sm font-semibold">
                {formatCurrency(candidate.summary.maxProfit)} max profit
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl font-bold tabular-nums leading-none text-primary">
                {formatPercent(candidate.summary.probabilityOfProfit)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Estimated probability of profit
              </p>
              <p className="mt-2 text-sm font-semibold text-destructive">
                {hasUnlimitedRisk
                  ? "Unlimited risk"
                  : `${formatCurrency(Math.abs(maxLoss))} maximum loss`}
              </p>
            </div>
          </div>

          <div className="space-y-1 text-sm leading-6 text-muted-foreground">
            <p>
              At {formatPrice(candidate.summary.targetUnderlyingPrice)}, the
              estimated P/L at expiration is{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(candidate.summary.targetProfitLoss)}
              </span>
              .
            </p>
            {hasUnlimitedRisk ? (
              <p>
                Risk is not capped, so losses can keep growing as the underlying
                price moves against the position.
              </p>
            ) : null}
          </div>
        </div>

        {/* Payoff chart */}
        <ChartContainer
          className={cn(
            "aspect-[2.4/1] min-h-32",
            featured && "lg:h-56 lg:w-full lg:aspect-auto",
          )}
          config={{
            expirationProfitLoss: {
              label: "Expiration P/L",
              color: "var(--primary)",
            },
          }}
        >
          <AreaChart
            accessibilityLayer
            data={candidate.evaluation.payoff}
            margin={{ bottom: 0, left: 0, right: 6, top: 6 }}
          >
            <defs>
              <linearGradient
                id={`${candidate.id}-pnl`}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--primary)"
                  stopOpacity={0.5}
                />
                <stop
                  offset="95%"
                  stopColor="var(--primary)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis
              dataKey="underlyingPrice"
              domain={["dataMin", "dataMax"]}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              tickFormatter={(value) => `$${value}`}
              type="number"
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              tickFormatter={(value) => formatCurrency(Number(value))}
              width={56}
            />
            <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1.5} />
            <ReferenceLine
              x={candidate.state.underlyingPrice}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <ReferenceLine
              x={candidate.summary.targetUnderlyingPrice}
              stroke="var(--destructive)"
              strokeDasharray="4 2"
              strokeWidth={1}
            />
            <Area
              dataKey="expirationProfitLoss"
              fill={`url(#${candidate.id}-pnl)`}
              isAnimationActive={false}
              stroke="var(--primary)"
              strokeWidth={2.5}
              type="linear"
            />
          </AreaChart>
        </ChartContainer>

        {/* Footer */}
        <div
          className={cn(
            "flex items-center justify-between gap-2 border-t border-border/70 pt-3 text-sm",
            featured && "lg:col-span-2",
          )}
        >
          <span className="font-mono text-xs text-muted-foreground">
            Expires{" "}
            {EXPIRATION_FORMAT.format(
              new Date(`${candidate.summary.expiration}T00:00:00.000Z`),
            )}
          </span>
          <Button
            nativeButton={false}
            size="sm"
            render={<Link href={candidate.summary.builderHref} />}
          >
            {featured && hasUnlimitedRisk
              ? "Review uncapped risk"
              : featured
                ? "Inspect top match"
                : "Open in Builder"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
