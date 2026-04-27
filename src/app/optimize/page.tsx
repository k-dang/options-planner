"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDecimal, formatPercent } from "@/lib/format";
import {
  type OptimizerCandidate,
  type OptimizerInputs,
  type OptimizerRankingMode,
  type OptimizerThesis,
  type OptionLeg,
  optimizeStrategies,
} from "@/lib/options";
import { cn } from "@/lib/utils";

const DEFAULT_INPUTS: OptimizerInputs = {
  symbol: "AAPL",
  thesis: "bullish",
  rankingMode: "target-profit",
  minDaysToExpiration: 20,
  maxDaysToExpiration: 70,
  minProbabilityOfProfit: 0,
};

export default function OptimizePage() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [symbolDraft, setSymbolDraft] = useState(DEFAULT_INPUTS.symbol);
  const strategyCards = useMemo(() => {
    const byStrategy = new Map<string, OptimizerCandidate>();

    for (const candidate of optimizeStrategies(inputs)) {
      const current = byStrategy.get(candidate.state.strategy);

      if (!current || candidate.summary.score > current.summary.score) {
        byStrategy.set(candidate.state.strategy, candidate);
      }
    }

    return [...byStrategy.values()].sort(
      (left, right) => right.summary.score - left.summary.score,
    );
  }, [inputs]);

  function updateInputs(next: Partial<OptimizerInputs>) {
    setInputs((current) => ({ ...current, ...next }));
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6">
        <header>
          <p className="font-medium text-muted-foreground text-sm">
            Options Planner
          </p>
          <h1 className="font-semibold text-3xl tracking-normal">
            Strategy optimizer
          </h1>
        </header>

        <section className="mx-auto grid w-full max-w-4xl gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-end gap-2">
              <Field className="flex-1">
                <FieldLabel htmlFor="symbol">Symbol</FieldLabel>
                <Input
                  className="h-9 uppercase"
                  id="symbol"
                  value={symbolDraft}
                  onChange={(event) => setSymbolDraft(event.target.value)}
                />
              </Field>
              <Button
                type="button"
                onClick={() =>
                  updateInputs({
                    symbol: symbolDraft.trim().toUpperCase() || "AAPL",
                  })
                }
              >
                Load
              </Button>
            </div>
            <div className="flex items-end pb-1 text-lg md:col-span-2">
              <span className="font-semibold">
                {formatCurrency(strategyCards[0]?.state.underlyingPrice ?? 0)}
              </span>
              <span className="ml-3 text-muted-foreground text-sm">
                Delayed quote
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {[
              ["bearish", "Bearish"],
              ["income", "Income"],
              ["bullish", "Bullish"],
            ].map(([value, label]) => (
              <Button
                aria-pressed={inputs.thesis === value}
                key={value}
                type="button"
                variant={inputs.thesis === value ? "default" : "outline"}
                onClick={() => {
                  if (isThesis(value)) {
                    updateInputs({ thesis: value });
                  }
                }}
              >
                {label}
              </Button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="target-underlying">
                Target underlying
              </FieldLabel>
              <Input
                id="target-underlying"
                min="1"
                step="1"
                type="number"
                value={
                  inputs.targetUnderlyingPrice ??
                  Math.round(
                    (strategyCards[0]?.state.underlyingPrice ?? 0) * 1.08,
                  )
                }
                onChange={(event) =>
                  updateInputs({
                    targetUnderlyingPrice: Number(event.target.value),
                  })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ranking-mode">Rank by</FieldLabel>
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                id="ranking-mode"
                value={inputs.rankingMode}
                onChange={(event) => {
                  if (isRankingMode(event.target.value)) {
                    updateInputs({ rankingMode: event.target.value });
                  }
                }}
              >
                <option value="target-profit">Target profit</option>
                <option value="target-probability">Target probability</option>
                <option value="delta-range">Delta range</option>
                <option value="max-profit">Max profit</option>
                <option value="downside-buffer">Downside buffer</option>
              </select>
            </Field>
          </div>
          <p className="text-muted-foreground text-sm">
            Results use deterministic generated US equity chains, Black-Scholes
            estimates, standard 100-share contracts, and no saved server-side
            state. Probability and delta rankings are model estimates.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {strategyCards.map((candidate) => (
            <StrategyCard candidate={candidate} key={candidate.id} />
          ))}
          {strategyCards.length === 0 ? (
            <Card className="rounded-lg">
              <CardContent>
                No strategies match the current filters.
              </CardContent>
            </Card>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function StrategyCard({ candidate }: { candidate: OptimizerCandidate }) {
  const maxProfit = candidate.summary.maxProfit ?? 0;
  const maxLoss = candidate.summary.maxLoss;
  const risk = Math.max(Math.abs(maxLoss ?? 0), 1);
  const returnOnRisk = maxProfit / risk;
  const optionLegs = candidate.state.legs.filter(
    (leg) => leg.kind === "option",
  );
  const title = titleCase(candidate.summary.strategyLabel);
  const profitColor =
    returnOnRisk >= 0.25 ? "text-primary" : "text-destructive";

  return (
    <Card className="overflow-hidden rounded-lg shadow-sm">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-xl">{title}</CardTitle>
        <div className="flex flex-wrap justify-center gap-1.5">
          {optionLegs.map((leg, index) => (
            <LegBadge
              key={`${leg.optionType}-${leg.side}-${leg.strike}-${index}`}
              leg={leg}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-sm">
              <span className={`font-semibold ${profitColor}`}>
                {formatPercent(returnOnRisk)}
              </span>{" "}
              Return on risk
            </p>
            <p className="font-semibold">
              {formatCurrency(candidate.summary.maxProfit)} Profit
            </p>
            <p className="text-muted-foreground text-xs">
              {formatCurrency(candidate.summary.targetProfitLoss)} at{" "}
              {formatCurrency(candidate.summary.targetUnderlyingPrice)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm">
              <span className="font-semibold text-primary">
                {formatPercent(candidate.summary.probabilityOfProfit)}
              </span>{" "}
              Chance
            </p>
            <p className="font-semibold">
              {maxLoss === null
                ? "Undefined"
                : formatCurrency(Math.abs(maxLoss))}{" "}
              Risk
            </p>
          </div>
        </div>
        <ChartContainer
          className="aspect-[2.25/1] min-h-36"
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
            margin={{ bottom: 0, left: 0, right: 6, top: 8 }}
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
                  stopOpacity={0.75}
                />
                <stop
                  offset="95%"
                  stopColor="var(--primary)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" />
            <XAxis
              dataKey="underlyingPrice"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={(value) => `$${value}`}
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={(value) => formatCurrency(Number(value))}
              width={58}
            />
            <ReferenceLine y={0} stroke="var(--foreground)" />
            <ReferenceLine
              x={candidate.state.underlyingPrice}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
            />
            <ReferenceLine
              x={candidate.summary.targetUnderlyingPrice}
              stroke="var(--destructive)"
              strokeDasharray="4 2"
            />
            <Area
              dataKey="expirationProfitLoss"
              fill={`url(#${candidate.id}-pnl)`}
              isAnimationActive={false}
              stroke="var(--primary)"
              strokeWidth={3}
              type="linear"
            />
          </AreaChart>
        </ChartContainer>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            {candidate.summary.expiration} • Δ{" "}
            {formatDecimal(candidate.summary.delta)}
          </span>
          <Button
            nativeButton={false}
            render={<Link href={candidate.summary.builderHref} />}
          >
            Open in Builder
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function isThesis(value: string | null): value is OptimizerThesis {
  return value === "bullish" || value === "bearish" || value === "income";
}

function isRankingMode(value: string | null): value is OptimizerRankingMode {
  return (
    value === "max-profit" ||
    value === "downside-buffer" ||
    value === "target-profit" ||
    value === "target-probability" ||
    value === "delta-range"
  );
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function LegBadge({ leg }: { leg: OptionLeg }) {
  const action = leg.side === "long" ? "Buy" : "Sell";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 font-medium text-xs",
        leg.side === "long"
          ? "border-primary/25 bg-primary/10 text-primary"
          : "border-destructive/25 bg-destructive/10 text-destructive",
      )}
    >
      <span className="font-semibold uppercase">{action}</span>
      <span>
        {formatCurrency(leg.strike)} {leg.optionType}
      </span>
    </span>
  );
}
