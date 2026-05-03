"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { TickerCombobox } from "@/components/ticker-combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  BUILDER_STRATEGIES,
  type OptimizerCandidate,
  type OptionChainSnapshot,
  scanRiskReward,
  type StrategyTemplateId,
} from "@/lib/options";
import { cn } from "@/lib/utils";

type SortColumn =
  | "strategy"
  | "bias"
  | "expiration"
  | "maxProfit"
  | "maxLoss"
  | "returnOnRisk"
  | "probabilityOfProfit";

type StrategyBias = "bullish" | "bearish" | "neutral";

const STRATEGY_BIAS: Record<StrategyTemplateId, StrategyBias> = {
  "long-call": "bullish",
  "short-put": "bullish",
  "cash-secured-put": "bullish",
  "bull-call-spread": "bullish",
  "bull-put-spread": "bullish",
  "covered-call": "bullish",
  "long-put": "bearish",
  "short-call": "bearish",
  "bear-put-spread": "bearish",
  "bear-call-spread": "bearish",
  "iron-condor": "neutral",
  "short-straddle": "neutral",
  "short-strangle": "neutral",
};

const BIAS_ORDER: Record<StrategyBias, number> = {
  bullish: 0,
  neutral: 1,
  bearish: 2,
};

type SortDirection = "asc" | "desc";

type ScanFilters = {
  minDays: number;
  maxDays: number;
  minPop: number;
  enabled: Set<StrategyTemplateId>;
};

const DEFAULT_FILTERS: Omit<ScanFilters, "enabled"> = {
  minDays: 7,
  maxDays: 60,
  minPop: 0.25,
};

export function ScanClient({
  initialChain,
}: {
  initialChain: OptionChainSnapshot;
}) {
  const router = useRouter();
  const [filters, setFilters] = useState<ScanFilters>({
    ...DEFAULT_FILTERS,
    enabled: new Set(BUILDER_STRATEGIES),
  });
  const [sort, setSort] = useState<{ column: SortColumn; dir: SortDirection }>({
    column: "returnOnRisk",
    dir: "desc",
  });
  const chain = initialChain;

  const candidates = useMemo(() => {
    return scanRiskReward(
      {
        symbol: chain.underlying.symbol,
        minDaysToExpiration: filters.minDays,
        maxDaysToExpiration: filters.maxDays,
        minProbabilityOfProfit: filters.minPop,
        enabledStrategies: [...filters.enabled],
      },
      chain,
    );
  }, [chain, filters]);

  const sortedCandidates = useMemo(() => {
    return [...candidates].sort((left, right) => compare(left, right, sort));
  }, [candidates, sort]);

  function setSortColumn(column: SortColumn) {
    setSort((current) =>
      current.column === column
        ? { column, dir: current.dir === "asc" ? "desc" : "asc" }
        : { column, dir: defaultDirection(column) },
    );
  }

  function toggleStrategy(strategy: StrategyTemplateId) {
    setFilters((current) => {
      const next = new Set(current.enabled);

      if (next.has(strategy)) {
        next.delete(strategy);
      } else {
        next.add(strategy);
      }

      return { ...current, enabled: next };
    });
  }

  function setAllStrategies(value: boolean) {
    setFilters((current) => ({
      ...current,
      enabled: value ? new Set(BUILDER_STRATEGIES) : new Set(),
    }));
  }

  function handleDteChange(value: number | readonly number[]) {
    if (!Array.isArray(value)) return;
    const [lo, hi] = value;

    if (typeof lo !== "number" || typeof hi !== "number") return;

    setFilters((current) => ({
      ...current,
      minDays: Math.min(lo, hi),
      maxDays: Math.max(lo, hi),
    }));
  }

  function handlePopChange(value: number | readonly number[]) {
    const next = Array.isArray(value) ? (value[0] ?? 0) : value;

    setFilters((current) => ({ ...current, minPop: next / 100 }));
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <header>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            Options Planner
          </p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight">
            Risk/Reward Scanner
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Scan every strategy and expiration for {chain.underlying.symbol},
            ranked by return on risk (max profit ÷ max loss).
          </p>
        </header>

        <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-white/60 p-6 shadow-xl backdrop-blur-xl dark:bg-white/4">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/12 blur-3xl" />

          <div className="relative flex flex-wrap items-center gap-3">
            <TickerCombobox
              defaultSymbol={chain.underlying.symbol}
              onNavigate={(symbol) =>
                router.push(`/scan?symbol=${encodeURIComponent(symbol)}`)
              }
            />
            <div className="font-mono text-sm text-muted-foreground">
              {formatCurrency(chain.underlying.price)}
            </div>
            <div className="ml-auto text-xs text-muted-foreground">
              {sortedCandidates.length} setups
            </div>
          </div>

          <div className="relative mt-5 grid gap-5 sm:grid-cols-2">
            <Field className="flex flex-col gap-2">
              <FieldLabel className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Days To Expiration · {filters.minDays}–{filters.maxDays}
              </FieldLabel>
              <div className="rounded-2xl border border-border/60 bg-white/80 px-4 py-3 shadow-sm dark:bg-white/8">
                <Slider
                  aria-label="Days to expiration"
                  min={1}
                  max={180}
                  step={1}
                  value={[filters.minDays, filters.maxDays]}
                  onValueChange={handleDteChange}
                />
              </div>
            </Field>

            <Field className="flex flex-col gap-2">
              <FieldLabel className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Min Probability of Profit · {formatPercent(filters.minPop)}
              </FieldLabel>
              <div className="rounded-2xl border border-border/60 bg-white/80 px-4 py-3 shadow-sm dark:bg-white/8">
                <Slider
                  aria-label="Minimum probability of profit"
                  min={0}
                  max={90}
                  step={5}
                  value={[Math.round(filters.minPop * 100)]}
                  onValueChange={handlePopChange}
                />
              </div>
            </Field>
          </div>

          <div className="relative mt-5">
            <div className="mb-2 flex items-center gap-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Strategies
              </span>
              <Button
                variant="link"
                size="xs"
                className="h-auto p-0 text-[11px] text-muted-foreground hover:text-foreground hover:no-underline"
                onClick={() => setAllStrategies(true)}
              >
                Select all
              </Button>
              <Button
                variant="link"
                size="xs"
                className="h-auto p-0 text-[11px] text-muted-foreground hover:text-foreground hover:no-underline"
                onClick={() => setAllStrategies(false)}
              >
                Clear
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {BUILDER_STRATEGIES.map((strategy) => {
                const enabled = filters.enabled.has(strategy);

                return (
                  <Button
                    key={strategy}
                    variant="outline"
                    size="xs"
                    aria-pressed={enabled}
                    onClick={() => toggleStrategy(strategy)}
                    className={cn(
                      enabled
                        ? "border-primary/40 bg-primary/15 text-foreground hover:bg-primary/20"
                        : "border-border/60 bg-white/60 text-muted-foreground hover:border-primary/30 dark:bg-white/5",
                    )}
                  >
                    {titleCase(strategy.replaceAll("-", " "))}
                  </Button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
          {sortedCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-lg font-semibold">No setups match</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try widening the DTE range, lowering PoP floor, or enabling
                more strategies.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <TableRow>
                    <SortableHeader
                      column="strategy"
                      sort={sort}
                      onSort={setSortColumn}
                    >
                      Strategy
                    </SortableHeader>
                    <SortableHeader
                      column="bias"
                      sort={sort}
                      onSort={setSortColumn}
                    >
                      Bias
                    </SortableHeader>
                    <SortableHeader
                      column="expiration"
                      sort={sort}
                      onSort={setSortColumn}
                    >
                      Expiration
                    </SortableHeader>
                    <TableHead>Strikes</TableHead>
                    <SortableHeader
                      column="maxProfit"
                      sort={sort}
                      onSort={setSortColumn}
                      align="right"
                    >
                      Max Profit
                    </SortableHeader>
                    <SortableHeader
                      column="maxLoss"
                      sort={sort}
                      onSort={setSortColumn}
                      align="right"
                    >
                      Max Loss
                    </SortableHeader>
                    <SortableHeader
                      column="returnOnRisk"
                      sort={sort}
                      onSort={setSortColumn}
                      align="right"
                    >
                      Return on Risk
                    </SortableHeader>
                    <SortableHeader
                      column="probabilityOfProfit"
                      sort={sort}
                      onSort={setSortColumn}
                      align="right"
                    >
                      Probability of Profit
                    </SortableHeader>
                    <TableHead>Breakevens</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCandidates.slice(0, 200).map((candidate) => (
                    <CandidateRow candidate={candidate} key={candidate.id} />
                  ))}
                </TableBody>
              </Table>
              {sortedCandidates.length > 200 && (
                <div className="border-t border-border/50 px-4 py-2 text-center text-xs text-muted-foreground">
                  Showing top 200 of {sortedCandidates.length} setups
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function CandidateRow({ candidate }: { candidate: OptimizerCandidate }) {
  const ror = candidate.summary.returnOnRisk;
  const isGoodRor = ror !== null && ror >= 0.25;
  const bias = STRATEGY_BIAS[candidate.state.strategy];

  return (
    <TableRow>
      <TableCell className="font-medium">
        {titleCase(candidate.summary.strategyLabel)}
      </TableCell>
      <TableCell>
        <BiasBadge bias={bias} />
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {candidate.summary.expiration}
      </TableCell>
      <TableCell className="font-mono text-xs">
        {candidate.summary.strikes.map((s) => `$${s}`).join(" / ")}
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums">
        {formatCurrency(candidate.summary.maxProfit)}
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums text-destructive">
        {candidate.summary.maxLoss === null
          ? "Undefined"
          : formatCurrency(Math.abs(candidate.summary.maxLoss))}
      </TableCell>
      <TableCell
        className={cn(
          "text-right font-mono font-semibold tabular-nums",
          ror === null
            ? "text-muted-foreground"
            : isGoodRor
              ? "text-profit"
              : "text-foreground",
        )}
      >
        {ror === null ? "n/a" : formatPercent(ror)}
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums text-primary">
        {formatPercent(candidate.summary.probabilityOfProfit)}
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {candidate.evaluation.breakevens.length === 0
          ? "—"
          : candidate.evaluation.breakevens
              .map((value) => `$${value.toFixed(2)}`)
              .join(", ")}
      </TableCell>
      <TableCell className="text-right">
        <Button
          nativeButton={false}
          size="sm"
          variant="outline"
          render={<Link href={candidate.summary.builderHref} />}
        >
          Open
        </Button>
      </TableCell>
    </TableRow>
  );
}

function BiasBadge({ bias }: { bias: StrategyBias }) {
  const className =
    bias === "bullish"
      ? "border-profit/30 bg-profit/10 text-profit"
      : bias === "bearish"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-border/60 bg-muted text-muted-foreground";

  return (
    <Badge variant="outline" className={cn("capitalize", className)}>
      {bias}
    </Badge>
  );
}

function SortableHeader({
  column,
  sort,
  onSort,
  align = "left",
  children,
}: {
  column: SortColumn;
  sort: { column: SortColumn; dir: SortDirection };
  onSort: (column: SortColumn) => void;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const active = sort.column === column;

  return (
    <TableHead className={align === "right" ? "text-right" : "text-left"}>
      <Button
        variant="ghost"
        size="xs"
        onClick={() => onSort(column)}
        className={cn(
          "h-auto gap-1 px-0 font-medium uppercase tracking-wider hover:bg-transparent hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {children}
        <span className="text-[9px] opacity-70">
          {active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </Button>
    </TableHead>
  );
}

function defaultDirection(column: SortColumn): SortDirection {
  return column === "strategy" || column === "bias" || column === "expiration"
    ? "asc"
    : "desc";
}

function compare(
  left: OptimizerCandidate,
  right: OptimizerCandidate,
  sort: { column: SortColumn; dir: SortDirection },
) {
  const sign = sort.dir === "asc" ? 1 : -1;

  switch (sort.column) {
    case "strategy":
      return sign * left.summary.strategyLabel.localeCompare(
        right.summary.strategyLabel,
      );
    case "bias":
      return (
        sign *
        (BIAS_ORDER[STRATEGY_BIAS[left.state.strategy]] -
          BIAS_ORDER[STRATEGY_BIAS[right.state.strategy]])
      );
    case "expiration":
      return sign * left.summary.expiration.localeCompare(
        right.summary.expiration,
      );
    case "maxProfit":
      return sign * compareNullable(
        left.summary.maxProfit,
        right.summary.maxProfit,
      );
    case "maxLoss":
      return sign * compareNullable(
        left.summary.maxLoss,
        right.summary.maxLoss,
      );
    case "returnOnRisk":
      return sign * compareNullable(
        left.summary.returnOnRisk,
        right.summary.returnOnRisk,
      );
    case "probabilityOfProfit":
      return sign * compareNullable(
        left.summary.probabilityOfProfit,
        right.summary.probabilityOfProfit,
      );
    default:
      return 0;
  }
}

function compareNullable(left: number | null, right: number | null) {
  if (left === null && right === null) return 0;
  if (left === null) return -1;
  if (right === null) return 1;

  return left - right;
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
