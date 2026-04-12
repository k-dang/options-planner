"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { EmptyState } from "@/components/optimize/empty-state";
import { LoadingSkeleton } from "@/components/optimize/loading-skeleton";
import { OptimizerControls } from "@/components/optimize/optimizer-controls";
import { StrategyCard } from "@/components/optimize/strategy-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSymbolSearch } from "@/hooks/use-symbol-search";
import { buildOptimizerHref } from "@/lib/optimizer-search-params";
import {
  getSentimentTargetPrice,
  type OptimizerSentimentKey,
} from "@/lib/optimizer-sentiments";
import type { SymbolSearchResult } from "@/modules/market/schemas";
import { computeOptimizerCards } from "@/modules/optimizer/compute-optimizer-cards";
import type { OptimizerSnapshotResult } from "@/modules/optimizer/load-optimizer-snapshot";
import type { OptimizerObjective } from "@/modules/optimizer/schemas";

type OptimizeClientProps = {
  initialRequest: { symbol: string } | null;
  initialResult: OptimizerSnapshotResult | null;
};

type OptimizerControlsState = {
  sentiment: OptimizerSentimentKey | null;
  targetPrice: number | null;
};

type OptimizationState = {
  activeSymbol: string | null;
  quoteName: string | null;
  quotePrice: number | null;
  expirations: string[];
};

const DEFAULT_OBJECTIVE: OptimizerObjective = "balanced";

const EMPTY_OPTIMIZATION_STATE: OptimizationState = {
  activeSymbol: null,
  quoteName: null,
  quotePrice: null,
  expirations: [],
};

export default function OptimizeClient({
  initialRequest,
  initialResult,
}: OptimizeClientProps) {
  const router = useRouter();
  const initialSymbol = initialRequest?.symbol ?? "";
  const optimization = buildInitialOptimizationState(
    initialSymbol,
    initialResult,
  );
  const controls = buildInitialControlsState(initialRequest, initialResult);
  const error = buildInitialError(initialResult);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [searchEnabled, setSearchEnabled] = useState(
    initialSymbol.length === 0,
  );
  const [selectedObjective, setSelectedObjective] = useState(DEFAULT_OBJECTIVE);
  const [selectedExpiration, setSelectedExpiration] = useState<string | null>(
    initialResult?.ok ? (initialResult.data.expirations[0] ?? null) : null,
  );
  const [budget, setBudget] = useState<number | null>(null);
  const [selectedSentiment, setSelectedSentiment] =
    useState<OptimizerSentimentKey | null>(controls.sentiment);
  const [targetPrice, setTargetPrice] = useState(
    controls.targetPrice ?? optimization.quotePrice ?? 0,
  );
  const deferredTargetPrice = useDeferredValue(targetPrice);
  const deferredSelectedExpiration = useDeferredValue(selectedExpiration);
  const deferredSelectedObjective = useDeferredValue(selectedObjective);
  const deferredBudget = useDeferredValue(budget);
  const deferredSelectedSentiment = useDeferredValue(selectedSentiment);
  const [isPending, startNavigationTransition] = useTransition();
  const normalizedSymbol = symbol.trim().toUpperCase();
  const debouncedSymbol = useDebouncedValue(normalizedSymbol, 150);
  const searchQuery = useSymbolSearch(debouncedSymbol, searchEnabled);
  const searchResults = searchQuery.results;
  const loading = isPending;
  const searchLoading =
    searchEnabled && debouncedSymbol.length > 0 && searchQuery.isFetching;
  const showSuggestions =
    searchEnabled &&
    normalizedSymbol.length > 0 &&
    searchResults.length > 0 &&
    !loading;

  const controlsVisible =
    optimization.quotePrice !== null && optimization.expirations.length > 0;
  const controlsQuotePrice = optimization.quotePrice ?? 0;
  const cards = useMemo(
    () =>
      getVisibleCards({
        initialResult,
        symbol: initialSymbol,
        selectedExpiration: deferredSelectedExpiration,
        objective: deferredSelectedObjective,
        budget: deferredBudget,
        selectedSentiment: deferredSelectedSentiment,
        targetPrice: deferredTargetPrice,
      }),
    [
      deferredBudget,
      deferredSelectedExpiration,
      deferredSelectedObjective,
      deferredSelectedSentiment,
      deferredTargetPrice,
      initialResult,
      initialSymbol,
    ],
  );
  const status = buildStatus(initialSymbol, initialResult, cards.length);
  const recomputing =
    targetPrice !== deferredTargetPrice ||
    selectedExpiration !== deferredSelectedExpiration ||
    selectedObjective !== deferredSelectedObjective ||
    budget !== deferredBudget ||
    selectedSentiment !== deferredSelectedSentiment;

  function navigateToOptimizer(
    symbol: string,
    historyMode: "push" | "replace",
  ) {
    const href = buildOptimizerHref("/", { symbol });

    startNavigationTransition(() => {
      if (historyMode === "push") {
        router.push(href);
        return;
      }

      router.replace(href);
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!normalizedSymbol) {
      return;
    }

    setSearchEnabled(false);
    navigateToOptimizer(normalizedSymbol, "push");
  }

  function handleSentimentChange(key: OptimizerSentimentKey, price: number) {
    setSelectedSentiment(key);
    setTargetPrice(price);
  }

  function handleTargetPriceChange(price: number) {
    setSelectedSentiment(
      findSentimentForTargetPrice(controlsQuotePrice, price),
    );
    setTargetPrice(price);
  }

  function handleSymbolSelect(result: SymbolSearchResult) {
    setSearchEnabled(false);
    setSymbol(result.symbol);
    navigateToOptimizer(result.symbol, "push");
  }

  return (
    <div className="grain grid-bg relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[300px] -top-[200px] h-[600px] w-[600px] rounded-full bg-[oklch(0.65_0.18_160_/_0.06)] blur-[120px]" />
        <div className="absolute -right-[200px] top-[100px] h-[500px] w-[500px] rounded-full bg-[oklch(0.55_0.15_200_/_0.04)] blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-[oklch(0.82_0.11_85_/_0.03)] blur-[120px]" />
      </div>

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col px-5 py-10 sm:px-8 lg:px-10">
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
                id="optimize-symbol"
                value={symbol}
                onChange={(event) => {
                  setSearchEnabled(true);
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

          <div className="mt-3 flex items-center gap-2.5 px-1">
            {optimization.activeSymbol ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[0.6rem] font-semibold text-primary ring-1 ring-primary/20">
                <span className="h-1 w-1 rounded-full bg-primary" />
                {optimization.activeSymbol}
              </span>
            ) : null}
            {optimization.quoteName ? (
              <span className="text-xs text-muted-foreground/70">
                {optimization.quoteName}
              </span>
            ) : null}
            <span className="font-mono text-[0.6rem] text-muted-foreground/50">
              {searchLoading && !loading
                ? "Searching..."
                : loading
                  ? "Optimizing strategies..."
                  : recomputing
                    ? "Recomputing locally..."
                    : status}
            </span>
          </div>

          {error ? (
            <div className="mt-3 max-w-2xl rounded-lg border border-loss/20 bg-loss/5 px-4 py-2.5 text-xs text-loss">
              {error}
            </div>
          ) : null}
        </div>

        {controlsVisible ? (
          <OptimizerControls
            quotePrice={controlsQuotePrice}
            sentiment={selectedSentiment}
            onSentimentChange={handleSentimentChange}
            targetPrice={targetPrice}
            onTargetPriceChange={handleTargetPriceChange}
            budget={budget}
            onBudgetChange={(budget) => {
              setBudget(budget);
            }}
            expirations={optimization.expirations}
            selectedExpiration={selectedExpiration}
            onExpirationChange={(selectedExpiration) => {
              setSelectedExpiration(selectedExpiration);
            }}
            objective={selectedObjective}
            onObjectiveChange={(objective) => {
              setSelectedObjective(objective);
            }}
          />
        ) : null}

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

function buildInitialOptimizationState(
  initialSymbol: string,
  initialResult: OptimizerSnapshotResult | null,
): OptimizationState {
  if (!initialResult?.ok) {
    return EMPTY_OPTIMIZATION_STATE;
  }

  return {
    activeSymbol: initialSymbol,
    quoteName: initialResult.data.quote.name,
    quotePrice: initialResult.data.quote.last,
    expirations: initialResult.data.expirations,
  };
}

function getVisibleCards(args: {
  initialResult: OptimizerSnapshotResult | null;
  symbol: string;
  selectedExpiration: string | null;
  objective: OptimizerObjective;
  budget: number | null;
  selectedSentiment: OptimizerSentimentKey | null;
  targetPrice: number;
}) {
  const {
    initialResult,
    symbol,
    selectedExpiration,
    objective,
    budget,
    selectedSentiment,
    targetPrice,
  } = args;

  if (!initialResult?.ok) {
    return [];
  }

  const expiry =
    selectedExpiration &&
    initialResult.data.expirations.includes(selectedExpiration)
      ? selectedExpiration
      : (initialResult.data.expirations[0] ?? null);

  if (!expiry) {
    return [];
  }

  const effectiveTargetPrice =
    selectedSentiment == null
      ? targetPrice
      : (getSentimentTargetPrice(
          initialResult.data.quote.last,
          selectedSentiment,
        ) ?? targetPrice);
  const cards = computeOptimizerCards({
    dataset: initialResult.data,
    request: {
      symbol,
      targetPrice: effectiveTargetPrice,
      targetDate: expiry,
      objective,
      maxLoss: budget ?? undefined,
    },
  });

  return cards;
}

function buildStatus(
  initialSymbol: string,
  initialResult: OptimizerSnapshotResult | null,
  visibleCardCount: number,
) {
  if (!initialSymbol) {
    return "Awaiting symbol input.";
  }

  if (!initialResult) {
    return "Awaiting symbol input.";
  }

  if (!initialResult.ok) {
    return "No strategy graphs available.";
  }

  return visibleCardCount > 0
    ? `${visibleCardCount} strategies optimized for ${initialSymbol}.`
    : "No strategy graphs available.";
}

function buildInitialError(initialResult: OptimizerSnapshotResult | null) {
  if (!initialResult || initialResult.ok) {
    return null;
  }

  return initialResult.error;
}

function buildInitialControlsState(
  _initialRequest: { symbol: string } | null,
  initialResult: OptimizerSnapshotResult | null,
): OptimizerControlsState {
  if (!initialResult?.ok) {
    return {
      sentiment: null,
      targetPrice: null,
    };
  }

  const targetPrice = initialResult.data.quote.last;

  return {
    sentiment: findSentimentForTargetPrice(
      initialResult.data.quote.last,
      targetPrice,
    ),
    targetPrice,
  };
}

function findSentimentForTargetPrice(quotePrice: number, targetPrice: number) {
  const sentimentKeys: OptimizerSentimentKey[] = [
    "very-bearish",
    "bearish",
    "neutral",
    "directional",
    "bullish",
    "very-bullish",
  ];

  return (
    sentimentKeys.find((sentiment) => {
      const candidatePrice = getSentimentTargetPrice(quotePrice, sentiment);
      return candidatePrice === targetPrice;
    }) ?? null
  );
}
