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
import type {
  OptimizerCandidate,
  StrategyCalcResponse,
  SymbolSearchResult,
} from "@/domain";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";

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

export default function OptimizeClient({
  initialSymbol,
}: OptimizeClientProps) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [quoteName, setQuoteName] = useState<string | null>(null);
  const [status, setStatus] = useState("Enter a symbol to compare strategies.");
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<StrategyCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const requestSequence = useRef(0);
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
    setStatus(`Loading strategy graphs for ${symbolToRun}...`);

    try {
      const [quoteResponse, expirationsResponse] = await Promise.all([
        fetch(`/api/market/quote?symbol=${encodeURIComponent(symbolToRun)}`),
        fetch(`/api/options/expirations?symbol=${encodeURIComponent(symbolToRun)}`),
      ]);

      if (sequence !== requestSequence.current) {
        return;
      }

      if (!quoteResponse.ok) {
        setCards([]);
        setQuoteName(null);
        setError((await getErrorMessage(quoteResponse)) || "Symbol lookup failed.");
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
          ? `Showing ${detailResponses.length} strategy graphs for ${symbolToRun}.`
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
    <main className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(18,184,134,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="space-y-3">
          <Badge variant="outline" className="w-fit">
            Optimize
          </Badge>
          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              Strategy P/L by symbol
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Type a supported symbol and the page will load the best current
              strategy graphs for that underlying.
            </p>
          </div>
        </div>

        <Card className="border border-white/10 bg-card/85 backdrop-blur">
          <CardContent className="flex flex-col gap-4 py-5">
            <form className="flex max-w-xl flex-col gap-3" onSubmit={onSubmit}>
              <label
                htmlFor="optimize-symbol"
                className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground"
              >
                Symbol
              </label>
              <div className="flex gap-2">
                <Input
                  id="optimize-symbol"
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value)}
                  placeholder="Search supported symbols"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  className="inline-flex h-7 shrink-0 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:bg-primary/80 disabled:pointer-events-none disabled:opacity-50"
                  disabled={!normalizedSymbol || loading}
                >
                  {loading ? "Loading..." : "Show graphs"}
                </button>
              </div>
              {showSuggestions ? (
                <div className="rounded-lg border border-white/10 bg-background/40 p-2">
                  <div className="mb-2 text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                    Supported symbols
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {searchResults.map((result) => (
                      <button
                        key={result.symbol}
                        type="button"
                        className="rounded-full border border-white/10 bg-background/60 px-3 py-1 text-xs text-foreground transition hover:bg-background"
                        onClick={() => setSymbol(result.symbol)}
                      >
                        {result.symbol}
                        <span className="ml-2 text-muted-foreground">
                          {result.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </form>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">
                {activeSymbol || normalizedSymbol || "No symbol"}
              </Badge>
              {quoteName ? <span>{quoteName}</span> : null}
              <span>
                {searchLoading && !loading
                  ? "Searching supported symbols..."
                  : loading
                    ? "Loading..."
                    : status}
              </span>
            </div>
            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {cards.map(({ candidate, detail }) => (
            <StrategyCard
              key={candidate.strategyName}
              candidate={candidate}
              detail={detail}
            />
          ))}
          {!loading && cards.length === 0 && !error ? (
            <Card className="border border-dashed border-white/10 bg-card/70">
              <CardContent className="py-10 text-center text-xs text-muted-foreground">
                Strategy graphs will appear here after you submit a supported symbol.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function StrategyCard({
  candidate,
  detail,
}: {
  candidate: OptimizerCandidate;
  detail: StrategyCalcResponse["data"];
}) {
  return (
    <Card className="border border-white/10 bg-card/90 backdrop-blur">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{candidate.strategyName}</CardTitle>
            <CardDescription>
              {formatLegSummary(candidate.legs)}
            </CardDescription>
          </div>
          <Badge variant="outline">
            {formatCurrency(candidate.expectedProfitAtTarget)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <AreaChart data={detail.chart.series}>
            <defs>
              <linearGradient id={gradientId(candidate.strategyName)} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-pnl)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--color-pnl)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="price"
              tickFormatter={(value) => formatAxisCurrency(value)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value) => formatAxisCurrency(value)}
              axisLine={false}
              tickLine={false}
              width={72}
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
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.22)" />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke="var(--color-pnl)"
              fill={`url(#${gradientId(candidate.strategyName)})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <Metric label="Expected profit" value={formatCurrency(candidate.expectedProfitAtTarget)} />
          <Metric label="Chance of profit" value={formatPercent(detail.summary.chanceOfProfitAtExpiration)} />
          <Metric label="Max profit" value={formatNullableCurrency(detail.summary.maxProfit)} />
          <Metric label="Max loss" value={formatNullableCurrency(detail.summary.maxLoss)} />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-background/30 px-3 py-2">
      <div className="text-[0.65rem] uppercase tracking-[0.14em]">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

async function getErrorMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
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
