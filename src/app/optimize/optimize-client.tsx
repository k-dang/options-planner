"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ExpirationTimeline } from "@/app/optimize/expiration-timeline";
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
import { TickerCombobox } from "@/components/ticker-combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Slider } from "@/components/ui/slider";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  type OptimizerCandidate,
  type OptimizerInputs,
  type OptimizerThesis,
  type OptionChainSnapshot,
  optimizeStrategies,
} from "@/lib/options";
import { cn } from "@/lib/utils";

const THESIS_OPTIONS = [
  ["bearish", "Bearish"],
  ["income", "Income"],
  ["bullish", "Bullish"],
] as [OptimizerThesis, string][];

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
  const [targetUnderlyingDraft, setTargetUnderlyingDraft] = useState(
    String(Math.round(initialChain.underlying.price * 1.08)),
  );
  const [debugOpen, setDebugOpen] = useState(false);
  const chain = initialChain;
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

  function handleSliderChange(value: number | readonly number[]) {
    updateInputs({
      returnChanceWeight: Array.isArray(value) ? (value[0] ?? 50) : value,
    });
  }

  function handleTargetBlur() {
    const p = Number(targetUnderlyingDraft);
    if (p > 0) updateInputs({ targetUnderlyingPrice: p });
  }

  function handleTargetKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      const p = Number(targetUnderlyingDraft);
      if (p > 0) updateInputs({ targetUnderlyingPrice: p });
    }
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
        <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-white/60 p-6 shadow-xl backdrop-blur-xl dark:bg-white/4">
          {/* Atmospheric blobs */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/12 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-primary/8 blur-2xl" />

          {/* Row 1: Symbol · Price · Thesis */}
          <div className="relative flex flex-wrap items-center gap-3">
            {/* Symbol */}
            <div>
              <TickerCombobox
                defaultSymbol={initialChain.underlying.symbol}
                onNavigate={(symbol) => router.push(optimizeSymbolHref(symbol))}
              />
            </div>

            {/* Price pill */}
            <div>{formatCurrency(chain.underlying.price)}</div>

            {/* Thesis — individual floating chips */}
            <div className="ml-auto flex items-center gap-2">
              {THESIS_OPTIONS.map(([value, label]) => (
                <Button
                  key={value}
                  aria-pressed={inputs.thesis === value}
                  variant={inputs.thesis === value ? "default" : "outline"}
                  className={cn(
                    "rounded-full shadow-sm",
                    inputs.thesis === value
                      ? "shadow-md"
                      : "border-border/60 bg-white/80 text-foreground/55 hover:border-primary/40 dark:bg-white/8",
                  )}
                  onClick={() => updateInputs({ thesis: value })}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Row 2: Target · Rank */}
          <div className="relative mt-4 grid gap-3 sm:grid-cols-2">
            {/* Target price */}
            <Field className="flex flex-col gap-1.5">
              <FieldLabel
                className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground"
                htmlFor="target-price"
              >
                Target Price
              </FieldLabel>
              <InputGroup className="rounded-full border-border/60 bg-white/80 shadow-sm dark:bg-input/20">
                <InputGroupAddon>$</InputGroupAddon>
                <InputGroupInput
                  id="target-price"
                  type="number"
                  min="1"
                  step="1"
                  className="font-mono font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  value={targetUnderlyingDraft}
                  onChange={(e) => setTargetUnderlyingDraft(e.target.value)}
                  onBlur={handleTargetBlur}
                  onKeyDown={handleTargetKeyDown}
                />
              </InputGroup>
            </Field>

            {/* Rank slider */}
            <Field className="flex flex-col gap-1.5">
              <FieldLabel
                className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground"
                htmlFor="rank-by"
              >
                Rank By
              </FieldLabel>
              <div className="rounded-2xl border border-border/60 bg-white/80 px-4 py-3 shadow-sm dark:bg-white/8">
                <Slider
                  aria-label="Rank by"
                  id="rank-by"
                  max={100}
                  min={0}
                  step={10}
                  value={[inputs.returnChanceWeight ?? 50]}
                  onValueChange={handleSliderChange}
                />
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>
                    Max Return{" "}
                    <span className="font-semibold tabular-nums text-foreground/70">
                      {100 - (inputs.returnChanceWeight ?? 50)}%
                    </span>
                  </span>
                  <span>
                    <span className="font-semibold tabular-nums text-foreground/70">
                      {inputs.returnChanceWeight ?? 50}%
                    </span>{" "}
                    Max Chance
                  </span>
                </div>
              </div>
            </Field>
          </div>

          {/* Row 3: Expiration timeline */}
          <div className="relative mt-4">
            <ExpirationTimeline
              expirations={chain.expirations}
              value={inputs.expiration}
              onChange={(expiration) => updateInputs({ expiration })}
            />
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
      <CardHeader className="pb-3 text-center">
        <div className="text-base font-semibold">{title}</div>
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

export function optimizeSymbolHref(
  symbolValue: string,
  fallbackSymbol = "AAPL",
) {
  const symbol = symbolValue.trim().toUpperCase() || fallbackSymbol;

  return `/optimize?symbol=${encodeURIComponent(symbol)}`;
}
