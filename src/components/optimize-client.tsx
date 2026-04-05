"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/optimize/empty-state";
import { LoadingSkeleton } from "@/components/optimize/loading-skeleton";
import { ObjectiveSlider } from "@/components/optimize/objective-slider";
import { StrategyCard } from "@/components/optimize/strategy-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SymbolSearchResult } from "@/modules/market/schemas";
import type {
  OptimizerObjective,
  OptimizerRunResponse,
} from "@/modules/optimizer/schemas";

type OptimizeClientProps = {
  initialSymbol: string;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

type StrategyCardData = OptimizerRunResponse["data"]["cards"][number];

const DEFAULT_OBJECTIVE: OptimizerObjective = "balanced";

export default function OptimizeClient({ initialSymbol }: OptimizeClientProps) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [quoteName, setQuoteName] = useState<string | null>(null);
  const [quotePrice, setQuotePrice] = useState<number | null>(null);
  const [expirations, setExpirations] = useState<string[]>([]);
  const [sentiment, setSentiment] = useState<string | null>(null);
  const [targetPrice, setTargetPrice] = useState<number | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [selectedExpiration, setSelectedExpiration] = useState<string | null>(
    null,
  );
  const [objective, setObjective] =
    useState<OptimizerObjective>(DEFAULT_OBJECTIVE);
  const [status, setStatus] = useState("Awaiting symbol input.");
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<StrategyCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const requestSequence = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedSymbolRef = useRef<string | null>(null);
  const normalizedSymbol = symbol.trim().toUpperCase();
  const showSuggestions =
    normalizedSymbol.length > 0 && searchResults.length > 0 && !loading;

  const controlsVisible = quotePrice !== null && expirations.length > 0;

  useEffect(() => {
    if (!normalizedSymbol) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    if (selectedSymbolRef.current === normalizedSymbol) {
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

  async function runOptimization(
    symbolToRun: string,
    overrides?: {
      targetPrice?: number | null;
      targetDate?: string | null;
      objective?: OptimizerObjective;
      maxLoss?: number | null;
    },
  ) {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setLoading(true);
    setError(null);
    setStatus(`Scanning strategies for ${symbolToRun}...`);

    try {
      const optimizerResponse = await fetch("/api/optimizer/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          symbol: symbolToRun,
          targetPrice: overrides?.targetPrice ?? targetPrice ?? undefined,
          targetDate: overrides?.targetDate ?? selectedExpiration ?? undefined,
          objective: overrides?.objective ?? objective,
          maxLoss: overrides?.maxLoss ?? budget ?? undefined,
        }),
      });

      if (sequence !== requestSequence.current) {
        return;
      }

      if (!optimizerResponse.ok) {
        setCards([]);
        setQuoteName(null);
        setError(
          (await getErrorMessage(optimizerResponse)) ||
            "Unable to optimize strategies.",
        );
        setStatus("No strategy graphs available.");
        return;
      }

      const optimized =
        (await optimizerResponse.json()) as OptimizerRunResponse;

      if (sequence !== requestSequence.current) {
        return;
      }

      if (!optimized.data.selectedExpiry) {
        setCards([]);
        setQuoteName(optimized.data.quote.name);
        setQuotePrice(optimized.data.quote.last);
        setExpirations(optimized.data.expirations);
        setError("No expirations available for that symbol.");
        setStatus("No strategy graphs available.");
        return;
      }

      setQuoteName(optimized.data.quote.name);
      setQuotePrice(optimized.data.quote.last);
      setExpirations(optimized.data.expirations);
      setCards(optimized.data.cards);
      setStatus(
        optimized.data.cards.length > 0
          ? `${optimized.data.cards.length} strategies optimized for ${symbolToRun}.`
          : `No strategy graphs available for ${symbolToRun}.`,
      );
      setActiveSymbol(symbolToRun);

      // Auto-populate controls on first run for this symbol
      if (!targetPrice) {
        setTargetPrice(optimized.data.quote.last);
      }
      if (!selectedExpiration && optimized.data.selectedExpiry) {
        setSelectedExpiration(optimized.data.selectedExpiry);
      }
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

  function handleSentimentChange(key: string, price: number) {
    setSentiment(key);
    setTargetPrice(price);
  }

  function handleTargetPriceChange(price: number) {
    setSentiment(null);
    setTargetPrice(price);
  }

  function handleSymbolSelect(result: SymbolSearchResult) {
    selectedSymbolRef.current = result.symbol;
    setSymbol(result.symbol);
    setSearchResults([]);
    setTargetPrice(null);
    setSelectedExpiration(null);
    setSentiment(null);
    setBudget(null);
    setObjective(DEFAULT_OBJECTIVE);
    void runOptimization(result.symbol, {
      targetPrice: null,
      targetDate: null,
      objective: DEFAULT_OBJECTIVE,
      maxLoss: null,
    });
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
        {/* Command bar search */}
        <div
          className="animate-fade-up relative z-30 mb-10"
          style={{ animationDelay: "100ms" }}
        >
          <form onSubmit={onSubmit} className="relative z-30 w-full">
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
              <Input
                ref={inputRef}
                id="optimize-symbol"
                value={symbol}
                onChange={(event) => {
                  selectedSymbolRef.current = null;
                  setSymbol(event.target.value);
                }}
                placeholder="Search by ticker or company name..."
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                className="h-12 flex-1 rounded-none border-0 bg-transparent px-3 text-sm text-foreground shadow-none ring-0 focus-visible:ring-0 placeholder:text-muted-foreground/40 dark:bg-transparent [&:-webkit-autofill]:![box-shadow:0_0_0px_1000px_oklch(0.12_0.008_260)_inset] [&:-webkit-autofill]:[caret-color:white] [&:-webkit-autofill]:![-webkit-text-fill-color:oklch(0.95_0_0)]"
              />
              {loading ? (
                <div className="mr-4 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  <span className="font-mono text-[0.6rem] uppercase tracking-widest text-primary/70">
                    Scanning
                  </span>
                </div>
              ) : (
                <Button
                  type="submit"
                  size="lg"
                  disabled={!normalizedSymbol || loading}
                  className="mr-2 rounded-lg font-mono text-[0.65rem] font-semibold uppercase tracking-[0.1em] hover:shadow-[0_0_16px_oklch(0.65_0.18_160_/_0.25)]"
                >
                  Optimize
                </Button>
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
                    onClick={() => handleSymbolSelect(result)}
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

        {/* Optimizer controls */}
        {controlsVisible ? (
          <OptimizerControls
            quotePrice={quotePrice}
            sentiment={sentiment}
            onSentimentChange={handleSentimentChange}
            targetPrice={targetPrice ?? quotePrice}
            onTargetPriceChange={handleTargetPriceChange}
            budget={budget}
            onBudgetChange={setBudget}
            expirations={expirations}
            selectedExpiration={selectedExpiration}
            onExpirationChange={setSelectedExpiration}
            objective={objective}
            onObjectiveChange={setObjective}
          />
        ) : null}

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

/* ── Optimizer Controls ────────────────────────────────────────────── */

const SENTIMENTS = [
  {
    key: "very-bearish",
    label: "Very Bearish",
    multiplier: 0.85,
    color: "oklch(0.65 0.2 25)",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <title>Very Bearish</title>
        <path d="M12 5v14" />
        <path d="M5 12l7 7 7-7" />
      </svg>
    ),
  },
  {
    key: "bearish",
    label: "Bearish",
    multiplier: 0.93,
    color: "oklch(0.7 0.15 55)",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <title>Bearish</title>
        <path d="M7 7l10 10" />
        <path d="M17 7v10H7" />
      </svg>
    ),
  },
  {
    key: "neutral",
    label: "Neutral",
    multiplier: 1.0,
    color: "oklch(0.6 0.01 260)",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <title>Neutral</title>
        <path d="M5 12h14" />
        <path d="M13 5l7 7-7 7" />
      </svg>
    ),
  },
  {
    key: "directional",
    label: "Directional",
    multiplier: 1.05,
    color: "oklch(0.65 0.2 300)",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <title>Directional</title>
        <path d="M16 7l5 5-5 5" />
        <path d="M8 7L3 12l5 5" />
        <path d="M21 12H3" />
      </svg>
    ),
  },
  {
    key: "bullish",
    label: "Bullish",
    multiplier: 1.1,
    color: "oklch(0.72 0.19 155)",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <title>Bullish</title>
        <path d="M7 17L17 7" />
        <path d="M7 7h10v10" />
      </svg>
    ),
  },
  {
    key: "very-bullish",
    label: "Very Bullish",
    multiplier: 1.2,
    color: "oklch(0.8 0.22 145)",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <title>Very Bullish</title>
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    ),
  },
] as const;

type OptimizerControlsProps = {
  quotePrice: number;
  sentiment: string | null;
  onSentimentChange: (key: string, targetPrice: number) => void;
  targetPrice: number;
  onTargetPriceChange: (price: number) => void;
  budget: number | null;
  onBudgetChange: (budget: number | null) => void;
  expirations: string[];
  selectedExpiration: string | null;
  onExpirationChange: (date: string) => void;
  objective: OptimizerObjective;
  onObjectiveChange: (value: OptimizerObjective) => void;
};

function OptimizerControls({
  quotePrice,
  sentiment,
  onSentimentChange,
  targetPrice,
  onTargetPriceChange,
  budget,
  onBudgetChange,
  expirations,
  selectedExpiration,
  onExpirationChange,
  objective,
  onObjectiveChange,
}: OptimizerControlsProps) {
  const pctChange = ((targetPrice - quotePrice) / quotePrice) * 100;
  const pctLabel =
    pctChange >= 0 ? `+${pctChange.toFixed(0)}%` : `${pctChange.toFixed(0)}%`;

  return (
    <div className="animate-fade-up mb-10 flex w-full flex-col items-center gap-6">
      {/* Sentiment selector */}
      <div className="grid w-full grid-cols-6 items-end">
        {SENTIMENTS.map((s) => {
          const isActive = sentiment === s.key;
          return (
            <button
              key={s.key}
              type="button"
              className="group flex flex-col items-center gap-1.5 w-full"
              onClick={() =>
                onSentimentChange(
                  s.key,
                  Math.round(quotePrice * s.multiplier * 100) / 100,
                )
              }
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full border transition-all sm:h-14 sm:w-14"
                style={{
                  borderColor: isActive ? s.color : "oklch(1 0 0 / 0.08)",
                  backgroundColor: isActive
                    ? `color-mix(in oklch, ${s.color} 15%, transparent)`
                    : "oklch(0.14 0.008 260)",
                  boxShadow: isActive
                    ? `0 0 12px color-mix(in oklch, ${s.color} 25%, transparent)`
                    : "none",
                  color: isActive ? s.color : "oklch(0.5 0.01 260)",
                }}
              >
                {s.icon}
              </div>
              <span
                className="font-mono text-[0.5rem] uppercase tracking-wider transition-colors sm:text-[0.55rem]"
                style={{
                  color: isActive ? s.color : "oklch(0.45 0.01 260)",
                }}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Target Price + Budget row */}
      <div className="flex w-full items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground/60">
            Target Price: $
          </span>
          <Input
            type="number"
            step="0.01"
            value={targetPrice.toFixed(2)}
            onChange={(e) => {
              const val = Number.parseFloat(e.target.value);
              if (!Number.isNaN(val) && val > 0) {
                onTargetPriceChange(val);
              }
            }}
            className="w-24 border-white/[0.08] bg-[oklch(0.12_0.008_260)] px-2.5 py-1.5 font-mono focus-visible:border-primary/30 focus-visible:ring-0"
          />
          <span
            className={`font-mono text-[0.65rem] font-medium ${pctChange >= 0 ? "text-profit" : "text-loss"}`}
          >
            ({pctLabel})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground/60">
            Budget: $
          </span>
          <Input
            type="text"
            inputMode="decimal"
            value={budget == null ? "" : budget}
            placeholder="None"
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (!raw) {
                onBudgetChange(null);
                return;
              }
              const val = Number.parseFloat(raw);
              if (!Number.isNaN(val) && val > 0) {
                onBudgetChange(val);
              }
            }}
            className="w-24 border-white/[0.08] bg-[oklch(0.12_0.008_260)] px-2.5 py-1.5 font-mono placeholder:text-muted-foreground/30 focus-visible:border-primary/30 focus-visible:ring-0"
          />
        </div>
      </div>

      {/* Expiration picker */}
      {expirations.length > 0 ? (
        <ExpirationPicker
          expirations={expirations}
          value={selectedExpiration}
          onChange={onExpirationChange}
        />
      ) : null}

      {/* Objective control */}
      <ObjectiveSlider value={objective} onChange={onObjectiveChange} />
    </div>
  );
}

/* ── Expiration Picker ─────────────────────────────────────────────── */

type MonthGroup = {
  label: string;
  dates: { iso: string; day: number }[];
};

function groupByMonth(dates: string[]): MonthGroup[] {
  const groups: Map<string, MonthGroup> = new Map();
  for (const iso of dates) {
    const d = new Date(`${iso}T12:00:00`);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        label: d.toLocaleDateString("en-US", { month: "short" }),
        dates: [],
      };
      groups.set(key, group);
    }
    group.dates.push({ iso, day: d.getDate() });
  }
  return Array.from(groups.values());
}

function ExpirationPicker({
  expirations,
  value,
  onChange,
}: {
  expirations: string[];
  value: string | null;
  onChange: (date: string) => void;
}) {
  const groups = groupByMonth(expirations);

  return (
    <div className="scrollbar-hide w-full overflow-x-auto py-2">
      <div className="flex w-full items-start justify-between px-1">
        {groups.map((group) => (
          <div
            key={group.label}
            className="flex flex-col items-center gap-1.5"
          >
            <span className="font-mono text-[0.55rem] uppercase tracking-wider text-muted-foreground/50">
              {group.label}
            </span>
            <div className="flex gap-0.5">
              {group.dates.map((d) => {
                const isSelected = value === d.iso;
                return (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => onChange(d.iso)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-[0.65rem] transition-all sm:h-9 sm:w-9 ${
                      isSelected
                        ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                        : "text-muted-foreground/60 hover:bg-white/[0.04] hover:text-muted-foreground"
                    }`}
                  >
                    {d.day}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────── */

async function getErrorMessage(response: Response) {
  const body = (await response
    .json()
    .catch(() => null)) as ApiErrorResponse | null;
  return body?.error?.message ?? null;
}
