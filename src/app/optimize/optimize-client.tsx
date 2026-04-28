"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { DebugDrawer } from "@/components/debug-drawer";
import { LegBadge } from "@/components/leg-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { formatCurrency, formatDecimal, formatPercent } from "@/lib/format";
import {
  type OptimizerCandidate,
  type OptimizerInputs,
  type OptimizerThesis,
  type OptionChainSnapshot,
  optimizeStrategies,
} from "@/lib/options";
import { cn } from "@/lib/utils";

const DEFAULT_INPUTS: OptimizerInputs = {
  symbol: "AAPL",
  thesis: "bullish",
  returnChanceWeight: 50,
  minDaysToExpiration: 20,
  maxDaysToExpiration: 70,
  minProbabilityOfProfit: 0,
};

export function OptimizeClient({
  initialChain,
}: {
  initialChain: OptionChainSnapshot;
}) {
  const router = useRouter();
  const defaultExpiration =
    initialChain.expirations.find((e) => e.daysToExpiration >= 30)
      ?.expiration ?? initialChain.expirations[0]?.expiration;
  const [inputs, setInputs] = useState({
    ...DEFAULT_INPUTS,
    symbol: initialChain.underlying.symbol,
    expiration: defaultExpiration,
  });
  const [symbolDraft, setSymbolDraft] = useState(
    initialChain.underlying.symbol,
  );
  const [targetUnderlyingDraft, setTargetUnderlyingDraft] = useState(
    String(Math.round(initialChain.underlying.price * 1.08)),
  );
  const [debugOpen, setDebugOpen] = useState(false);
  const chain = initialChain;
  const expirationLabel =
    chain.expirations.find(
      (candidate) => candidate.expiration === inputs.expiration,
    )?.expiration ?? "";
  const strategyCards = useMemo(() => {
    const byStrategy = new Map<string, OptimizerCandidate>();

    for (const candidate of optimizeStrategies(inputs, chain)) {
      const current = byStrategy.get(candidate.state.strategy);

      if (!current || candidate.summary.score > current.summary.score) {
        byStrategy.set(candidate.state.strategy, candidate);
      }
    }

    return [...byStrategy.values()].sort(
      (left, right) => right.summary.score - left.summary.score,
    );
  }, [inputs, chain]);
  const optimizerDebugJson = useMemo(
    () =>
      JSON.stringify(
        {
          inputs,
          selectedCards: strategyCards.map((candidate) =>
            optimizerCandidateDebug(candidate),
          ),
        },
        null,
        2,
      ),
    [inputs, strategyCards],
  );
  const initialChainDebugJson = useMemo(
    () => JSON.stringify(initialChain, null, 2),
    [initialChain],
  );

  function updateInputs(next: Partial<OptimizerInputs>) {
    setInputs((current) => ({ ...current, ...next }));
  }

  function loadSymbol() {
    const symbol = symbolDraft.trim().toUpperCase() || "AAPL";

    router.push(`/optimize?symbol=${encodeURIComponent(symbol)}`);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6">
        <header className="pb-2">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
            Options Planner
          </p>
          <h1 className="mt-1 font-semibold text-4xl tracking-tight">
            Strategy optimizer
          </h1>
        </header>

        <section className="mx-auto grid w-full gap-5 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-end gap-2">
            <Field className="flex-1">
              <FieldLabel htmlFor="symbol">Symbol</FieldLabel>
              <Input
                className="h-9 uppercase"
                id="symbol"
                value={symbolDraft}
                onChange={(event) => setSymbolDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    loadSymbol();
                  }
                }}
              />
            </Field>
            <Button type="button" onClick={loadSymbol}>
              Load
            </Button>
            <div className="flex items-baseline gap-3 pb-0.5 md:col-span-2 items-center">
              <span className="text-2xl font-bold tabular-nums">
                {formatCurrency(chain.underlying.price)}
              </span>
              <Badge variant="secondary">
                {chain.expirations[0]?.calls[0]?.provider ?? "generated"}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
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

          <div className="grid gap-3 md:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="target-underlying">
                Target underlying
              </FieldLabel>
              <Input
                id="target-underlying"
                min="1"
                step="1"
                type="number"
                value={targetUnderlyingDraft}
                onChange={(event) =>
                  setTargetUnderlyingDraft(event.target.value)
                }
                onBlur={() => {
                  const parsed = Number(targetUnderlyingDraft);
                  if (parsed > 0) {
                    updateInputs({ targetUnderlyingPrice: parsed });
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    const parsed = Number(targetUnderlyingDraft);
                    if (parsed > 0) {
                      updateInputs({ targetUnderlyingPrice: parsed });
                    }
                  }
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="expiration">Expiration</FieldLabel>
              <Select
                id="expiration"
                value={inputs.expiration ?? ""}
                onValueChange={(value) => {
                  if (value) {
                    updateInputs({ expiration: value });
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <span className="truncate">{expirationLabel}</span>
                </SelectTrigger>
                <SelectContent>
                  {chain.expirations.map((candidate) => (
                    <SelectItem
                      key={candidate.expiration}
                      value={candidate.expiration}
                    >
                      {candidate.expiration} ({candidate.daysToExpiration}d)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="return-chance-weight">Rank by</FieldLabel>
              <div className="grid gap-2 rounded-lg border bg-card px-3 py-2">
                <Slider
                  aria-label="Rank by max return or max chance"
                  id="return-chance-weight"
                  max={100}
                  min={0}
                  step={10}
                  value={[inputs.returnChanceWeight ?? 50]}
                  onValueChange={(value) =>
                    updateInputs({
                      returnChanceWeight: Array.isArray(value)
                        ? (value[0] ?? 50)
                        : value,
                    })
                  }
                />
                <div className="flex items-center justify-between gap-3 font-medium text-sm">
                  <span>← Max Return</span>
                  <span>Max Chance →</span>
                </div>
              </div>
            </Field>
          </div>
          <p className="text-muted-foreground text-sm">
            Results use the configured option-chain provider, Black-Scholes
            estimates, standard 100-share contracts, and no saved server-side
            state. Probability and delta rankings are model estimates.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
      <DebugDrawer
        closeLabel="Close optimizer debug panel"
        openLabel="Open optimizer debug panel"
        open={debugOpen}
        panels={[
          {
            title: "Currently selected optimizer cards",
            value: optimizerDebugJson,
          },
          {
            title: "Full initialChain payload",
            value: initialChainDebugJson,
          },
        ]}
        subtitle={`Provider ${
          chain.expirations[0]?.calls[0]?.provider ?? "n/a"
        } · ${chain.underlying.symbol} ${formatCurrency(
          chain.underlying.price,
        )}`}
        summary={[
          { label: "As of", value: chain.underlying.asOf },
          { label: "Expirations", value: String(chain.expirations.length) },
        ]}
        title="Optimizer debug"
        onClose={() => setDebugOpen(false)}
        onOpen={() => setDebugOpen(true)}
      />
    </main>
  );
}

function optimizerCandidateDebug(candidate: OptimizerCandidate) {
  return {
    id: candidate.id,
    strategy: candidate.state.strategy,
    symbol: candidate.state.symbol,
    underlyingPrice: candidate.state.underlyingPrice,
    expiration: candidate.summary.expiration,
    strikes: candidate.summary.strikes,
    score: candidate.summary.score,
    rankingInputs: {
      maxProfit: candidate.summary.maxProfit,
      maxLoss: candidate.summary.maxLoss,
      returnProfitBasis: candidate.summary.returnProfitBasis,
      returnProfitBasisLabel: candidate.summary.returnProfitBasisLabel,
      riskDenominator: candidate.summary.riskDenominator,
      returnOnRisk: candidate.summary.returnOnRisk,
      probabilityOfProfit: candidate.summary.probabilityOfProfit,
    },
    summary: {
      netPremium: candidate.summary.netPremium,
      targetUnderlyingPrice: candidate.summary.targetUnderlyingPrice,
      targetProfitLoss: candidate.summary.targetProfitLoss,
      delta: candidate.summary.delta,
      builderHref: candidate.summary.builderHref,
    },
    legs: candidate.state.legs,
    evaluatedLegs: candidate.evaluation.legs,
    breakevens: candidate.evaluation.breakevens,
  };
}

function StrategyCard({ candidate }: { candidate: OptimizerCandidate }) {
  const maxLoss = candidate.summary.maxLoss;
  const returnOnRisk = candidate.summary.returnOnRisk;
  const optionLegs = candidate.state.legs.filter(
    (leg) => leg.kind === "option",
  );
  const title = titleCase(candidate.summary.strategyLabel);
  const profitColor =
    returnOnRisk !== null && returnOnRisk >= 0.25
      ? "text-primary"
      : "text-destructive";
  const returnLabel =
    candidate.summary.returnProfitBasisLabel === "target-profit"
      ? "Target return/risk"
      : "Return on risk";

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
        <div className="grid grid-cols-2 gap-3 border-b pb-3">
          <div>
            <p className={cn("text-2xl font-bold tabular-nums", profitColor)}>
              {formatPercent(returnOnRisk)}
            </p>
            <p className="text-muted-foreground text-xs">{returnLabel}</p>
            <p className="mt-1.5 font-semibold text-sm">
              {formatCurrency(candidate.summary.maxProfit)} profit
            </p>
            <p className="text-muted-foreground text-xs">
              {formatCurrency(candidate.summary.targetProfitLoss)} at{" "}
              {formatCurrency(candidate.summary.targetUnderlyingPrice)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums text-primary">
              {formatPercent(candidate.summary.probabilityOfProfit)}
            </p>
            <p className="text-muted-foreground text-xs">Chance</p>
            <p className="mt-1.5 font-semibold text-sm">
              {maxLoss === null
                ? "Undefined"
                : formatCurrency(Math.abs(maxLoss))}{" "}
              risk
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

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
