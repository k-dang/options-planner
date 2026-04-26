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
  type OptimizerThesis,
  optimizeStrategies,
} from "@/lib/options";

const DEFAULT_INPUTS: OptimizerInputs = {
  symbol: "AAPL",
  thesis: "bullish",
  minDaysToExpiration: 20,
  maxDaysToExpiration: 70,
  maxCapitalRequired: Number.POSITIVE_INFINITY,
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
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium text-muted-foreground text-sm">
              Options Planner
            </p>
            <h1 className="font-semibold text-3xl tracking-normal">
              Strategy optimizer
            </h1>
          </div>
          <Link href="/build">Builder</Link>
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
  const capital = Math.max(candidate.summary.capitalRequired, 1);
  const returnOnRisk = maxProfit / capital;
  const optionLegs = candidate.state.legs.filter(
    (leg) => leg.kind === "option",
  );
  const title = titleCase(candidate.summary.strategyLabel);
  const subtitle = optionLegs
    .map(
      (leg) =>
        `${leg.side === "long" ? "Buy" : "Sell"} ${leg.strike}${leg.optionType[0]?.toUpperCase()}`,
    )
    .join(", ");
  const profitColor =
    returnOnRisk >= 0.25 ? "text-primary" : "text-destructive";

  return (
    <Card className="overflow-hidden rounded-lg shadow-sm">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-xl">{title}</CardTitle>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
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
          </div>
          <div className="text-right">
            <p className="text-sm">
              <span className="font-semibold text-primary">
                {formatPercent(candidate.summary.probabilityOfProfit)}
              </span>{" "}
              Chance
            </p>
            <p className="font-semibold">
              {formatCurrency(candidate.summary.capitalRequired)} Risk
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

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
