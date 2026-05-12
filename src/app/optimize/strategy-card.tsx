import Link from "next/link";
import { memo } from "react";
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
import { formatCurrency, formatPercent } from "@/lib/format";
import type { OptimizerCandidate } from "@/lib/options";
import { cn } from "@/lib/utils";

export const StrategyCard = memo(
  StrategyCardImpl,
  (prev, next) => prev.candidate.id === next.candidate.id,
);

function StrategyCardImpl({ candidate }: { candidate: OptimizerCandidate }) {
  const maxLoss = candidate.summary.maxLoss;
  const returnOnRisk = candidate.summary.returnOnRisk;
  const optionLegs = candidate.state.legs.filter(
    (leg) => leg.kind === "option",
  );
  const title = titleCase(candidate.summary.strategyLabel);
  const returnLabel =
    candidate.summary.returnProfitBasisLabel === "target-profit"
      ? "Target return/risk"
      : "Return on risk";
  const isGoodReturn = returnOnRisk !== null && returnOnRisk >= 0.25;

  return (
    <Card className="flex flex-col overflow-hidden rounded-xl shadow-sm">
      <CardHeader className="pb-3 text-center">
        <div className="text-base font-semibold">{title}</div>
        <div className="mt-1.5 flex flex-wrap justify-center gap-1">
          {optionLegs.map((leg) => (
            <LegBadge
              key={`${leg.optionType}-${leg.side}-${leg.strike}-${leg.expiration}`}
              leg={leg}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/30 px-4 py-3">
          <div>
            <p
              className={cn(
                "font-mono text-2xl font-bold tabular-nums leading-none",
                isGoodReturn ? "text-profit" : "text-destructive",
              )}
            >
              {formatPercent(returnOnRisk)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {returnLabel}
            </p>
            <p className="mt-2 text-sm font-semibold">
              {formatCurrency(candidate.summary.maxProfit)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatCurrency(candidate.summary.targetProfitLoss)} at{" "}
              {formatCurrency(candidate.summary.targetUnderlyingPrice)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold tabular-nums leading-none text-primary">
              {formatPercent(candidate.summary.probabilityOfProfit)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Probability of profit
            </p>
            <p className="mt-2 text-sm font-semibold text-destructive">
              {maxLoss === null
                ? "Undefined risk"
                : `${formatCurrency(Math.abs(maxLoss))} risk`}
            </p>
          </div>
        </div>

        {/* Payoff chart */}
        <ChartContainer
          className="aspect-[2.4/1] min-h-32"
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
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              tickFormatter={(value) => `$${value}`}
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
        <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2 text-sm">
          <span className="font-mono text-xs text-muted-foreground">
            {candidate.summary.expiration}
          </span>
          <Button
            nativeButton={false}
            size="sm"
            render={<Link href={candidate.summary.builderHref} />}
          >
            Open in Builder
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
