"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BiasBadge, STRATEGY_BIAS } from "@/components/bias-badge";
import { TickerCombobox } from "@/components/ticker-combobox";
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
import { scanSymbolHref } from "@/lib/hrefs";
import {
  BUILDER_STRATEGIES,
  type OptimizerCandidate,
  type OptionChainSnapshot,
  type StrategyTemplateId,
  scanRiskReward,
} from "@/lib/options";
import { cn } from "@/lib/utils";

type SortColumn =
  | "strategy"
  | "expiration"
  | "score"
  | "maxProfit"
  | "maxLoss"
  | "returnOnRisk"
  | "probabilityOfProfit";

type SortDirection = "asc" | "desc";

type ScanFilters = {
  minDays: number;
  maxDays: number;
  minPop: number;
  enabled: Set<StrategyTemplateId>;
};

const DEFAULT_FILTERS: Omit<ScanFilters, "enabled"> = {
  minDays: 30,
  maxDays: 60,
  minPop: 0.25,
};
const RETURN_ON_RISK_SORT_CAP = 5;

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
    column: "score",
    dir: "desc",
  });
  const [page, setPage] = useState(0);
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

  const PAGE_SIZE = 50;
  const totalPages = Math.ceil(sortedCandidates.length / PAGE_SIZE);
  const pagedCandidates = sortedCandidates.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  function setSortColumn(column: SortColumn) {
    setPage(0);
    setSort((current) =>
      current.column === column
        ? { column, dir: current.dir === "asc" ? "desc" : "asc" }
        : { column, dir: defaultDirection(column) },
    );
  }

  function toggleStrategy(strategy: StrategyTemplateId) {
    setPage(0);
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
    setPage(0);
    setFilters((current) => ({
      ...current,
      enabled: value ? new Set(BUILDER_STRATEGIES) : new Set(),
    }));
  }

  function handleDteChange(value: number | readonly number[]) {
    if (!Array.isArray(value)) return;
    const [lo, hi] = value;

    if (typeof lo !== "number" || typeof hi !== "number") return;

    setPage(0);
    setFilters((current) => ({
      ...current,
      minDays: Math.min(lo, hi),
      maxDays: Math.max(lo, hi),
    }));
  }

  function handlePopChange(value: number | readonly number[]) {
    const next = Array.isArray(value) ? (value[0] ?? 0) : value;

    setPage(0);
    setFilters((current) => ({ ...current, minPop: next / 100 }));
  }

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-white/60 p-6 shadow-xl backdrop-blur-xl dark:bg-white/4">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/12 blur-3xl" />

        <div className="relative flex flex-wrap items-center gap-3">
          <TickerCombobox
            defaultSymbol={chain.underlying.symbol}
            onNavigate={(symbol) => router.push(scanSymbolHref(symbol))}
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
              Try widening the DTE range, lowering PoP floor, or enabling more
              strategies.
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
                    column="expiration"
                    sort={sort}
                    onSort={setSortColumn}
                  >
                    Expiration
                  </SortableHeader>
                  <TableHead>Strikes</TableHead>
                  <SortableHeader
                    column="score"
                    sort={sort}
                    onSort={setSortColumn}
                    align="right"
                  >
                    Score
                  </SortableHeader>
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
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedCandidates.map((candidate) => (
                  <CandidateRow candidate={candidate} key={candidate.id} />
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t border-border/50 px-4 py-2">
              <span className="text-xs text-muted-foreground">
                {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, sortedCandidates.length)} of{" "}
                {sortedCandidates.length} setups
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}

function CandidateRow({ candidate }: { candidate: OptimizerCandidate }) {
  const ror = candidate.summary.returnOnRisk;
  const isGoodRor = ror !== null && ror >= 0.25;
  const bias = STRATEGY_BIAS[candidate.state.strategy];

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex flex-col gap-1">
          {titleCase(candidate.summary.strategyLabel)}
          <BiasBadge bias={bias} />
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {candidate.summary.expiration}
      </TableCell>
      <TableCell className="font-mono text-xs">
        {candidate.summary.strikes.map((s) => `$${s}`).join(" / ")}
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums">
        {formatPercent(candidate.summary.score)}
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
        <div>{ror === null ? "n/a" : formatPercent(ror)}</div>
        {candidate.summary.returnProfitBasisLabel === "target-profit" && (
          <div className="mt-0.5 text-[10px] font-normal text-muted-foreground">
            target
          </div>
        )}
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums text-primary">
        {formatPercent(candidate.summary.probabilityOfProfit)}
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
  return column === "strategy" || column === "expiration" ? "asc" : "desc";
}

function compare(
  left: OptimizerCandidate,
  right: OptimizerCandidate,
  sort: { column: SortColumn; dir: SortDirection },
) {
  const sign = sort.dir === "asc" ? 1 : -1;

  switch (sort.column) {
    case "strategy":
      return (
        sign *
        left.summary.strategyLabel.localeCompare(right.summary.strategyLabel)
      );
    case "expiration":
      return (
        sign * left.summary.expiration.localeCompare(right.summary.expiration)
      );
    case "score":
      return sign * compareNullable(left.summary.score, right.summary.score);
    case "maxProfit":
      return (
        sign * compareNullable(left.summary.maxProfit, right.summary.maxProfit)
      );
    case "maxLoss":
      return (
        sign * compareNullable(left.summary.maxLoss, right.summary.maxLoss)
      );
    case "returnOnRisk":
      return (
        sign *
        compareNullable(
          cappedReturnOnRisk(left.summary.returnOnRisk),
          cappedReturnOnRisk(right.summary.returnOnRisk),
        )
      );
    case "probabilityOfProfit":
      return (
        sign *
        compareNullable(
          left.summary.probabilityOfProfit,
          right.summary.probabilityOfProfit,
        )
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

function cappedReturnOnRisk(value: number | null) {
  return value === null ? null : Math.min(value, RETURN_ON_RISK_SORT_CAP);
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
