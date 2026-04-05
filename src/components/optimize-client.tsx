"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/optimize/empty-state";
import { LoadingSkeleton } from "@/components/optimize/loading-skeleton";
import { OptimizerControls } from "@/components/optimize/optimizer-controls";
import { StrategyCard } from "@/components/optimize/strategy-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  runOptimizer as runOptimizerRequest,
  searchSymbols,
} from "@/lib/optimizer-api";
import type { SymbolSearchResult } from "@/modules/market/schemas";
import type {
  OptimizerObjective,
  OptimizerRunResponse,
} from "@/modules/optimizer/schemas";

type OptimizeClientProps = {
  initialSymbol: string;
};

type StrategyCardData = OptimizerRunResponse["data"]["cards"][number];

type OptimizerControlsState = {
  sentiment: string | null;
  targetPrice: number | null;
  budget: number | null;
  selectedExpiration: string | null;
  objective: OptimizerObjective;
};

type OptimizationState = {
  activeSymbol: string | null;
  quoteName: string | null;
  quotePrice: number | null;
  expirations: string[];
  cards: StrategyCardData[];
};

type OptimizationOverrides = {
  targetPrice?: number | null;
  targetDate?: string | null;
  objective?: OptimizerObjective;
  maxLoss?: number | null;
};

type RunOptimizerInput = Parameters<typeof runOptimizerRequest>[0];

const DEFAULT_OBJECTIVE: OptimizerObjective = "balanced";

const DEFAULT_CONTROLS_STATE: OptimizerControlsState = {
  sentiment: null,
  targetPrice: null,
  budget: null,
  selectedExpiration: null,
  objective: DEFAULT_OBJECTIVE,
};

const EMPTY_OPTIMIZATION_STATE: OptimizationState = {
  activeSymbol: null,
  quoteName: null,
  quotePrice: null,
  expirations: [],
  cards: [],
};

function buildOptimizerInput(
  symbol: string,
  controls: OptimizerControlsState,
  overrides?: OptimizationOverrides,
): RunOptimizerInput {
  return {
    symbol,
    targetPrice: overrides?.targetPrice ?? controls.targetPrice ?? undefined,
    targetDate:
      overrides?.targetDate ?? controls.selectedExpiration ?? undefined,
    objective: overrides?.objective ?? controls.objective,
    maxLoss: overrides?.maxLoss ?? controls.budget ?? undefined,
  };
}

function buildOptimizationState(
  activeSymbol: string,
  optimized: OptimizerRunResponse,
  cards = optimized.data.cards,
): OptimizationState {
  const { quote, expirations } = optimized.data;

  return {
    activeSymbol,
    quoteName: quote.name,
    quotePrice: quote.last,
    expirations,
    cards,
  };
}

function useSymbolSearch(symbol: string, enabled: boolean) {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const [results, setResults] = useState<SymbolSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !normalizedSymbol) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const timeoutId = window.setTimeout(async () => {
      setLoading(true);

      try {
        const matches = await searchSymbols(normalizedSymbol);

        if (!cancelled) {
          setResults(matches.slice(0, 6));
        }
      } catch {
        if (!cancelled) {
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [enabled, normalizedSymbol]);

  return {
    normalizedSymbol,
    searchResults: results,
    searchLoading: loading,
    clearSearchResults: () => setResults([]),
  };
}

export default function OptimizeClient({ initialSymbol }: OptimizeClientProps) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [optimization, setOptimization] = useState(EMPTY_OPTIMIZATION_STATE);
  const [controls, setControls] = useState(DEFAULT_CONTROLS_STATE);
  const [status, setStatus] = useState("Awaiting symbol input.");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(true);
  const requestSequence = useRef(0);
  const { normalizedSymbol, searchResults, searchLoading, clearSearchResults } =
    useSymbolSearch(symbol, searchEnabled);
  const showSuggestions =
    normalizedSymbol.length > 0 && searchResults.length > 0 && !loading;

  const controlsVisible =
    optimization.quotePrice !== null && optimization.expirations.length > 0;
  const controlsQuotePrice = optimization.quotePrice ?? 0;

  function resetControls() {
    setControls(DEFAULT_CONTROLS_STATE);
  }

  function updateControls(patch: Partial<OptimizerControlsState>) {
    setControls((current) => ({
      ...current,
      ...patch,
    }));
  }

  function clearOptimization() {
    setOptimization((current) => ({
      ...EMPTY_OPTIMIZATION_STATE,
      activeSymbol: current.activeSymbol,
    }));
  }

  function updateOptimizationResult(
    symbolToRun: string,
    optimized: OptimizerRunResponse,
  ) {
    const { quote, selectedExpiry, cards } = optimized.data;

    setOptimization(buildOptimizationState(symbolToRun, optimized));

    setControls((current) => ({
      ...current,
      targetPrice: current.targetPrice ?? quote.last,
      selectedExpiration: current.selectedExpiration ?? selectedExpiry,
    }));

    setStatus(
      cards.length > 0
        ? `${cards.length} strategies optimized for ${symbolToRun}.`
        : `No strategy graphs available for ${symbolToRun}.`,
    );
  }

  function showNoStrategies(errorMessage: string) {
    setError(errorMessage);
    setStatus("No strategy graphs available.");
  }

  async function runOptimization(
    symbolToRun: string,
    overrides?: OptimizationOverrides,
  ) {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setLoading(true);
    setError(null);
    setStatus(`Scanning strategies for ${symbolToRun}...`);

    try {
      const optimizerResponse = await runOptimizerRequest(
        buildOptimizerInput(symbolToRun, controls, overrides),
      );

      if (sequence !== requestSequence.current) {
        return;
      }

      if (!optimizerResponse.ok) {
        clearOptimization();
        showNoStrategies(optimizerResponse.error);
        return;
      }

      const optimized = optimizerResponse.data;

      if (sequence !== requestSequence.current) {
        return;
      }

      if (!optimized.data.selectedExpiry) {
        setOptimization(buildOptimizationState(symbolToRun, optimized, []));
        showNoStrategies("No expirations available for that symbol.");
        return;
      }

      updateOptimizationResult(symbolToRun, optimized);
    } catch (caughtError) {
      if (sequence !== requestSequence.current) {
        return;
      }

      clearOptimization();
      showNoStrategies(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load strategy graphs.",
      );
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

    setSearchEnabled(false);
    clearSearchResults();
    await runOptimization(normalizedSymbol);
  }

  function handleSentimentChange(key: string, price: number) {
    updateControls({
      sentiment: key,
      targetPrice: price,
    });
  }

  function handleTargetPriceChange(price: number) {
    updateControls({
      sentiment: null,
      targetPrice: price,
    });
  }

  function handleSymbolSelect(result: SymbolSearchResult) {
    setSearchEnabled(false);
    setSymbol(result.symbol);
    clearSearchResults();
    resetControls();
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
            quotePrice={controlsQuotePrice}
            sentiment={controls.sentiment}
            onSentimentChange={handleSentimentChange}
            targetPrice={controls.targetPrice ?? controlsQuotePrice}
            onTargetPriceChange={handleTargetPriceChange}
            budget={controls.budget}
            onBudgetChange={(budget) => {
              updateControls({ budget });
            }}
            expirations={optimization.expirations}
            selectedExpiration={controls.selectedExpiration}
            onExpirationChange={(selectedExpiration) => {
              updateControls({ selectedExpiration });
            }}
            objective={controls.objective}
            onObjectiveChange={(objective) => {
              updateControls({ objective });
            }}
          />
        ) : null}

        {/* Strategy cards grid */}
        <div className="grid gap-5 lg:grid-cols-2">
          {optimization.cards.map(({ candidate, detail }, index) => (
            <div
              key={candidate.strategyName}
              className="animate-card-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <StrategyCard candidate={candidate} detail={detail} />
            </div>
          ))}
          {!loading && optimization.cards.length === 0 && !error ? (
            <div
              className="animate-fade-up lg:col-span-2"
              style={{ animationDelay: "200ms" }}
            >
              <EmptyState />
            </div>
          ) : null}
          {loading && optimization.cards.length === 0 ? (
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
