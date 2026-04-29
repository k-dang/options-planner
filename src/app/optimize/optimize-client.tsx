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
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        {/* Page header */}
        <header>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            Options Planner
          </p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight">
            Strategy Optimizer
          </h1>
        </header>

        {/* Filter controls */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          {/* Row 1: Symbol + price + thesis */}
          <div className="flex flex-wrap items-end gap-3">
            <Field className="w-32 shrink-0">
              <FieldLabel htmlFor="symbol">Symbol</FieldLabel>
              <Input
                className="h-9 font-mono uppercase"
                id="symbol"
                value={symbolDraft}
                onChange={(event) => setSymbolDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") loadSymbol();
                }}
              />
            </Field>
            <Button type="button" onClick={loadSymbol} className="mb-0.5">
              Load
            </Button>
            <div className="flex items-center gap-2 pb-0.5">
              <span className="font-mono text-2xl font-bold tabular-nums">
                {formatCurrency(chain.underlying.price)}
              </span>
              <Badge variant="secondary" className="text-xs">
                {chain.expirations[0]?.calls[0]?.provider ?? "generated"}
              </Badge>
            </div>

            <div className="ml-auto flex items-center gap-1.5 pb-0.5">
              {(
                [
                  ["bearish", "Bearish"],
                  ["income", "Income"],
                  ["bullish", "Bullish"],
                ] as [OptimizerThesis, string][]
              ).map(([value, label]) => (
                <Button
                  aria-pressed={inputs.thesis === value}
                  key={value}
                  type="button"
                  size="sm"
                  variant={inputs.thesis === value ? "default" : "outline"}
                  onClick={() => updateInputs({ thesis: value })}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Row 2: Target + expiration + ranking */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="target-underlying">
                Target underlying
              </FieldLabel>
              <Input
                id="target-underlying"
                min="1"
                step="1"
                type="number"
                className="font-mono"
                value={targetUnderlyingDraft}
                onChange={(event) =>
                  setTargetUnderlyingDraft(event.target.value)
                }
                onBlur={() => {
                  const parsed = Number(targetUnderlyingDraft);
                  if (parsed > 0)
                    updateInputs({ targetUnderlyingPrice: parsed });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    const parsed = Number(targetUnderlyingDraft);
                    if (parsed > 0)
                      updateInputs({ targetUnderlyingPrice: parsed });
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
                  if (value) updateInputs({ expiration: value });
                }}
              >
                <SelectTrigger className="w-full font-mono">
                  <span className="truncate">{expirationLabel}</span>
                </SelectTrigger>
                <SelectContent>
                  {chain.expirations.map((candidate) => (
                    <SelectItem
                      key={candidate.expiration}
                      value={candidate.expiration}
                    >
                      {candidate.expiration}{" "}
                      <span className="text-muted-foreground">
                        ({candidate.daysToExpiration}d)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="return-chance-weight">Rank by</FieldLabel>

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
              <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>Max Return</span>
                <span>Max Chance</span>
              </div>
            </Field>
          </div>
        </section>

        {/* Strategy card grid */}
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {strategyCards.map((candidate) => (
            <StrategyCard candidate={candidate} key={candidate.id} />
          ))}
          {strategyCards.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
              <p className="text-lg font-semibold">No strategies match</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting the thesis, expiration, or target price.
              </p>
            </div>
          )}
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
  const returnLabel =
    candidate.summary.returnProfitBasisLabel === "target-profit"
      ? "Target return/risk"
      : "Return on risk";
  const isGoodReturn = returnOnRisk !== null && returnOnRisk >= 0.25;

  return (
    <Card className="flex flex-col overflow-hidden rounded-xl shadow-sm">
      {/* Card header: name + leg badges */}
      <CardHeader className="pb-3 text-center">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <div className="mt-1.5 flex flex-wrap justify-center gap-1">
          {optionLegs.map((leg, index) => (
            <LegBadge
              key={`${leg.optionType}-${leg.side}-${leg.strike}-${index}`}
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
