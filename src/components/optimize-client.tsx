"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type {
  OptimizerCandidate,
  StrategyCalcResponse,
  SymbolSearchResult,
} from "@/domain";

type OptimizeClientProps = {
  initialSymbol: string;
};

type QuoteResponse = {
  data: {
    symbol: string;
    name: string;
    last: number;
  };
};

type ExpirationsResponse = {
  data: string[];
};

type OptimizerResponse = {
  data: {
    candidates: OptimizerCandidate[];
  };
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

type StrategyCardData = {
  candidate: OptimizerCandidate;
  detail: StrategyCalcResponse["data"];
};

const chartConfig = {
  pnl: {
    label: "P/L",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;

export default function OptimizeClient({ initialSymbol }: OptimizeClientProps) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [quoteName, setQuoteName] = useState<string | null>(null);
  const [status, setStatus] = useState("Awaiting symbol input.");
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<StrategyCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const requestSequence = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const normalizedSymbol = symbol.trim().toUpperCase();
  const showSuggestions =
    normalizedSymbol.length > 0 && searchResults.length > 0 && !loading;

  useEffect(() => {
    if (!normalizedSymbol) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setSearchLoading(true);

      try {
        const response = await fetch(
          `/api/market/symbols?q=${encodeURIComponent(normalizedSymbol)}`,
        );
        if (!response.ok) {
          setSearchResults([]);
          return;
        }
        const body = (await response.json()) as { data: SymbolSearchResult[] };
        setSearchResults(body.data.slice(0, 6));
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [normalizedSymbol]);

  async function runOptimization(symbolToRun: string) {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setLoading(true);
    setError(null);
    setStatus(`Scanning strategies for ${symbolToRun}...`);

    try {
      const [quoteResponse, expirationsResponse] = await Promise.all([
        fetch(`/api/market/quote?symbol=${encodeURIComponent(symbolToRun)}`),
        fetch(
          `/api/options/expirations?symbol=${encodeURIComponent(symbolToRun)}`,
        ),
      ]);

      if (sequence !== requestSequence.current) {
        return;
      }

      if (!quoteResponse.ok) {
        setCards([]);
        setQuoteName(null);
        setError(
          (await getErrorMessage(quoteResponse)) || "Symbol lookup failed.",
        );
        setStatus("Enter a supported symbol.");
        return;
      }

      const quote = (await quoteResponse.json()) as QuoteResponse;
      const expirations = expirationsResponse.ok
        ? ((await expirationsResponse.json()) as ExpirationsResponse).data
        : [];

      if (expirations.length === 0) {
        setCards([]);
        setQuoteName(quote.data.name);
        setError("No expirations available for that symbol.");
        setStatus("No strategy graphs available.");
        return;
      }

      const optimizerResponse = await fetch("/api/optimizer/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          symbol: symbolToRun,
          targetPrice: quote.data.last,
          targetDate: expirations[0],
          objective: "expectedProfit",
          maxLegs: 2,
          strikeWindow: 2,
        }),
      });

      if (sequence !== requestSequence.current) {
        return;
      }

      if (!optimizerResponse.ok) {
        setCards([]);
        setQuoteName(quote.data.name);
        setError(
          (await getErrorMessage(optimizerResponse)) ||
            "Unable to optimize strategies.",
        );
        setStatus("No strategy graphs available.");
        return;
      }

      const optimized = (await optimizerResponse.json()) as OptimizerResponse;
      const bestByStrategy = Object.values(
        Object.fromEntries(
          optimized.data.candidates.map((candidate) => [
            candidate.strategyName,
            candidate,
          ]),
        ),
      );

      const detailResponses = await Promise.all(
        bestByStrategy.map(async (candidate) => {
          const response = await fetch("/api/strategies/calc", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              builderState: candidate.builderState,
            }),
          });

          if (!response.ok) {
            throw new Error(
              (await getErrorMessage(response)) ||
                `Unable to load chart for ${candidate.strategyName}.`,
            );
          }

          const detail = (await response.json()) as StrategyCalcResponse;
          return {
            candidate,
            detail: detail.data,
          } satisfies StrategyCardData;
        }),
      );

      if (sequence !== requestSequence.current) {
        return;
      }

      setQuoteName(quote.data.name);
      setCards(detailResponses);
      setStatus(
        detailResponses.length > 0
          ? `${detailResponses.length} strategies optimized for ${symbolToRun}.`
          : `No strategy graphs available for ${symbolToRun}.`,
      );
      setActiveSymbol(symbolToRun);
    } catch (caughtError) {
      if (sequence !== requestSequence.current) {
        return;
      }

      setCards([]);
      setQuoteName(null);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load strategy graphs.",
      );
      setStatus("No strategy graphs available.");
    } finally {
      if (sequence === requestSequence.current) {
        setLoading(false);
      }
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!normalizedSymbol) {
      return;
    }

    setSearchResults([]);
    await runOptimization(normalizedSymbol);
  }

  return (
    <div className="grain grid-bg relative min-h-screen overflow-hidden">
      {/* Atmospheric gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[300px] -top-[200px] h-[600px] w-[600px] rounded-full bg-[oklch(0.65_0.18_160_/_0.06)] blur-[120px]" />
        <div className="absolute -right-[200px] top-[100px] h-[500px] w-[500px] rounded-full bg-[oklch(0.55_0.15_200_/_0.04)] blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-[oklch(0.82_0.11_85_/_0.03)] blur-[120px]" />
      </div>

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col px-5 py-10 sm:px-8 lg:px-10">
        {/* Hero section */}
        <header className="animate-fade-up mb-12 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4 text-primary"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <title>Trend line</title>
                <path
                  d="M3 17l6-6 4 4 8-8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 7h4v4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
              Options Planner
            </span>
          </div>

          <div className="max-w-2xl space-y-4">
            <h1 className="font-heading text-5xl leading-[1.1] tracking-tight text-foreground sm:text-6xl">
              Find the optimal
              <br />
              <span className="text-primary">strategy.</span>
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
              Enter a ticker to scan every available options strategy and
              surface the highest expected-value plays with full P/L
              visualization.
            </p>
          </div>
        </header>

        {/* Command bar search */}
        <div
          className="animate-fade-up relative z-30 mb-10"
          style={{ animationDelay: "100ms" }}
        >
          <form onSubmit={onSubmit} className="relative z-30 max-w-2xl">
            <div className="group relative flex items-center overflow-hidden rounded-xl border border-white/[0.08] bg-[oklch(0.12_0.008_260)] shadow-[0_0_0_1px_oklch(1_0_0_/_0.04),0_4px_24px_oklch(0_0_0_/_0.3)] transition-all focus-within:border-primary/30 focus-within:shadow-[0_0_0_1px_oklch(0.65_0.18_160_/_0.15),0_4px_32px_oklch(0.65_0.18_160_/_0.08)]">
              <div className="flex h-12 items-center pl-4 text-muted-foreground/60">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <title>Search</title>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                </svg>
              </div>
              <input
                ref={inputRef}
                id="optimize-symbol"
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                placeholder="Search by ticker or company name..."
                autoCapitalize="characters"
                spellCheck={false}
                className="h-12 flex-1 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
              />
              {loading ? (
                <div className="mr-4 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  <span className="font-mono text-[0.6rem] uppercase tracking-widest text-primary/70">
                    Scanning
                  </span>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={!normalizedSymbol || loading}
                  className="mr-2 inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-all hover:bg-primary/85 hover:shadow-[0_0_16px_oklch(0.65_0.18_160_/_0.25)] disabled:pointer-events-none disabled:opacity-30"
                >
                  Optimize
                </button>
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions ? (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-white/[0.08] bg-[oklch(0.13_0.008_260)] p-1.5 shadow-[0_16px_48px_oklch(0_0_0_/_0.4)]">
                <div className="mb-1.5 px-2.5 pt-1">
                  <span className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-muted-foreground/60">
                    Matches
                  </span>
                </div>
                {searchResults.map((result) => (
                  <button
                    key={result.symbol}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.04]"
                    onClick={() => setSymbol(result.symbol)}
                  >
                    <span className="inline-flex h-6 w-14 items-center justify-center rounded-md bg-primary/10 font-mono text-[0.65rem] font-semibold text-primary">
                      {result.symbol}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {result.name}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </form>

          {/* Status bar */}
          <div className="mt-3 flex items-center gap-2.5 px-1">
            {activeSymbol ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[0.6rem] font-semibold text-primary ring-1 ring-primary/20">
                <span className="h-1 w-1 rounded-full bg-primary" />
                {activeSymbol}
              </span>
            ) : null}
            {quoteName ? (
              <span className="text-xs text-muted-foreground/70">
                {quoteName}
              </span>
            ) : null}
            <span className="font-mono text-[0.6rem] text-muted-foreground/50">
              {searchLoading && !loading
                ? "Searching..."
                : loading
                  ? "Optimizing strategies..."
                  : status}
            </span>
          </div>

          {error ? (
            <div className="mt-3 max-w-2xl rounded-lg border border-loss/20 bg-loss/5 px-4 py-2.5 text-xs text-loss">
              {error}
            </div>
          ) : null}
        </div>

        {/* Strategy cards grid */}
        <div className="grid gap-5 lg:grid-cols-2">
          {cards.map(({ candidate, detail }, index) => (
            <div
              key={candidate.strategyName}
              className="animate-card-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <StrategyCard candidate={candidate} detail={detail} />
            </div>
          ))}
          {!loading && cards.length === 0 && !error ? (
            <div
              className="animate-fade-up lg:col-span-2"
              style={{ animationDelay: "200ms" }}
            >
              <EmptyState />
            </div>
          ) : null}
          {loading && cards.length === 0 ? (
            <>
              <LoadingSkeleton />
              <LoadingSkeleton delay={150} />
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[oklch(0.12_0.008_260)]">
      {/* Decorative grid lines */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute bottom-0 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full bg-primary/5 blur-[60px]" />
      </div>

      <div className="relative flex flex-col items-center gap-5 px-8 py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-6 w-6 text-muted-foreground/30"
            stroke="currentColor"
            strokeWidth="1"
          >
            <title>Chart</title>
            <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M7 16l4-8 4 4 6-8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium text-foreground/50">
            No strategies loaded
          </p>
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground/40">
            Enter a ticker symbol above to scan options chains and visualize the
            highest expected-value strategies.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
          <span className="font-mono text-[0.55rem] tracking-wider text-muted-foreground/30">
            Try AAPL, TSLA, or SPY
          </span>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="animate-card-in overflow-hidden rounded-2xl border border-white/[0.06] bg-[oklch(0.14_0.008_260)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-2">
            <div className="animate-shimmer h-4 w-32 rounded-md bg-white/[0.04]" />
            <div className="animate-shimmer h-3 w-48 rounded-md bg-white/[0.03]" />
          </div>
          <div className="animate-shimmer h-6 w-20 rounded-full bg-white/[0.04]" />
        </div>
        <div className="animate-shimmer h-56 w-full rounded-lg bg-white/[0.03]" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="animate-shimmer h-14 rounded-lg bg-white/[0.03]" />
          <div className="animate-shimmer h-14 rounded-lg bg-white/[0.03]" />
          <div className="animate-shimmer h-14 rounded-lg bg-white/[0.03]" />
          <div className="animate-shimmer h-14 rounded-lg bg-white/[0.03]" />
        </div>
      </div>
    </div>
  );
}

function StrategyCard({
  candidate,
  detail,
}: {
  candidate: OptimizerCandidate;
  detail: StrategyCalcResponse["data"];
}) {
  const isProfit = candidate.expectedProfitAtTarget >= 0;

  return (
    <Card className="group/strategy overflow-hidden border-white/[0.06] bg-[oklch(0.14_0.008_260)] shadow-[0_2px_16px_oklch(0_0_0_/_0.2)] transition-all hover:border-white/[0.1] hover:shadow-[0_4px_32px_oklch(0_0_0_/_0.3)]">
      <CardHeader className="space-y-3 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="font-heading text-lg tracking-tight">
              {candidate.strategyName}
            </CardTitle>
            <CardDescription className="font-mono text-[0.65rem] tracking-wide">
              {formatLegSummary(candidate.legs)}
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              isProfit
                ? "border-profit/25 bg-profit/10 font-mono text-profit"
                : "border-loss/25 bg-loss/10 font-mono text-loss"
            }
          >
            {formatCurrency(candidate.expectedProfitAtTarget)}
          </Badge>
        </div>

        {/* Thin accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </CardHeader>

      <CardContent className="grid gap-4 pt-2">
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <AreaChart data={detail.chart.series}>
            <defs>
              <linearGradient
                id={gradientId(candidate.strategyName)}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--color-pnl)"
                  stopOpacity={0.25}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-pnl)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="oklch(1 0 0 / 0.04)" />
            <XAxis
              dataKey="price"
              tickFormatter={(value) => formatAxisCurrency(value)}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "oklch(0.5 0 0)" }}
            />
            <YAxis
              tickFormatter={(value) => formatAxisCurrency(value)}
              axisLine={false}
              tickLine={false}
              width={72}
              tick={{ fontSize: 10, fill: "oklch(0.5 0 0)" }}
            />
            <Tooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-mono font-medium text-foreground">
                      {formatCurrency(Number(value))}
                    </span>
                  )}
                  labelFormatter={(_, payload) => {
                    const hoveredPrice = payload?.[0]?.payload?.price;
                    return hoveredPrice == null
                      ? "Underlying"
                      : `Underlying ${formatCurrency(Number(hoveredPrice))}`;
                  }}
                />
              }
            />
            <ReferenceLine
              y={0}
              stroke="oklch(1 0 0 / 0.12)"
              strokeDasharray="4 4"
            />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke="var(--color-pnl)"
              fill={`url(#${gradientId(candidate.strategyName)})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>

        <div className="grid grid-cols-2 gap-2">
          <Metric
            label="Expected profit"
            value={formatCurrency(candidate.expectedProfitAtTarget)}
            tone={candidate.expectedProfitAtTarget >= 0 ? "profit" : "loss"}
          />
          <Metric
            label="Chance of profit"
            value={formatPercent(detail.summary.chanceOfProfitAtExpiration)}
            tone={
              detail.summary.chanceOfProfitAtExpiration > 0.5
                ? "profit"
                : "neutral"
            }
          />
          <Metric
            label="Max profit"
            value={formatNullableCurrency(detail.summary.maxProfit)}
            tone="profit"
          />
          <Metric
            label="Max loss"
            value={formatNullableCurrency(detail.summary.maxLoss)}
            tone="loss"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "profit" | "loss" | "neutral";
}) {
  const toneClasses = {
    profit: "text-profit",
    loss: "text-loss",
    neutral: "text-foreground",
  };

  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 transition-colors hover:bg-white/[0.03]">
      <div className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground/50">
        {label}
      </div>
      <div
        className={`mt-1 font-mono text-sm font-medium ${toneClasses[tone]}`}
      >
        {value}
      </div>
    </div>
  );
}

async function getErrorMessage(response: Response) {
  const body = (await response
    .json()
    .catch(() => null)) as ApiErrorResponse | null;
  return body?.error?.message ?? null;
}

function gradientId(name: string) {
  return `optimize-${name.toLowerCase().replace(/\s+/g, "-")}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNullableCurrency(value: number | null) {
  return value == null ? "Unlimited" : formatCurrency(value);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatAxisCurrency(value: number) {
  return `$${Math.round(value)}`;
}

function formatLegSummary(legs: OptimizerCandidate["legs"]) {
  return legs
    .map((leg) => {
      if (leg.kind === "stock") {
        return `${capitalize(leg.side)} stock`;
      }
      return `${capitalize(leg.side)} ${leg.right === "C" ? "call" : "put"} ${Math.round(leg.strike ?? 0)}`;
    })
    .join(" · ");
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
