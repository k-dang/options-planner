"use client";

import { Plus, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { BiasBadge, STRATEGY_BIAS } from "@/components/bias-badge";
import {
  createDefaultScanFilters,
  ScanCriteriaControls,
  type ScanFilters,
} from "@/components/scan-criteria-controls";
import { TickerCombobox } from "@/components/ticker-combobox";
import { Button } from "@/components/ui/button";
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
  addWatchlistSymbolAction,
  removeWatchlistSymbolAction,
  scanWatchlistAction,
  type WatchlistActionState,
  type WatchlistScanActionState,
} from "@/lib/ticker-watchlist-actions";
import type { WatchlistScanCandidate } from "@/lib/ticker-watchlist-scan";
import { cn } from "@/lib/utils";

const INITIAL_STATE: WatchlistActionState = {
  ok: true,
  message: null,
};
const INITIAL_SCAN_STATE: WatchlistScanActionState = {
  ok: true,
  message: null,
  result: null,
};
const RETURN_ON_RISK_SORT_CAP = 5;

type SortColumn =
  | "ticker"
  | "strategy"
  | "expiration"
  | "score"
  | "maxProfit"
  | "maxLoss"
  | "returnOnRisk"
  | "probabilityOfProfit";
type SortDirection = "asc" | "desc";

export function AddWatchlistSymbolForm() {
  const [state, formAction, pending] = useActionState(
    addWatchlistSymbolAction,
    INITIAL_STATE,
  );

  return (
    <div className="flex w-full max-w-md flex-col gap-1.5">
      <form action={formAction} className="flex items-center gap-2">
        <TickerCombobox
          defaultSymbol=""
          inputName="symbol"
          resetOnBlur={false}
        />
        <Button type="submit" disabled={pending}>
          {pending ? (
            <RefreshCw aria-hidden="true" className="animate-spin" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          Add
        </Button>
      </form>
      <p
        className={cn(
          "min-h-4 text-xs",
          state.ok ? "text-muted-foreground" : "text-destructive",
        )}
      >
        {state.message}
      </p>
    </div>
  );
}

export function RemoveWatchlistSymbolButton({
  id,
  symbol,
}: {
  id: string;
  symbol: string;
}) {
  const [state, formAction, pending] = useActionState(
    removeWatchlistSymbolAction,
    INITIAL_STATE,
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          aria-label={`Remove ${symbol}`}
          title={`Remove ${symbol}`}
          className="text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
        >
          {pending ? (
            <RefreshCw aria-hidden="true" className="animate-spin" />
          ) : (
            <Trash2 aria-hidden="true" />
          )}
        </Button>
      </form>
      {!state.ok && state.message ? (
        <p className="max-w-40 text-right text-xs text-destructive">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

export function WatchlistScanner({ symbolCount }: { symbolCount: number }) {
  const [state, action, pending] = useActionState(
    scanWatchlistAction,
    INITIAL_SCAN_STATE,
  );
  const [filters, setFilters] = useState<ScanFilters>(createDefaultScanFilters);
  const [sort, setSort] = useState<{ column: SortColumn; dir: SortDirection }>({
    column: "score",
    dir: "desc",
  });
  const result = state.result;

  function setSortColumn(column: SortColumn) {
    setSort((current) =>
      current.column === column
        ? { column, dir: current.dir === "asc" ? "desc" : "asc" }
        : { column, dir: defaultDirection(column) },
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <form action={action} className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Risk/Reward scan</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Adjust shared criteria, then scan every saved ticker on demand.
              </p>
            </div>
            <Button
              type="submit"
              disabled={
                pending || symbolCount === 0 || filters.enabled.size === 0
              }
            >
              <RefreshCw
                aria-hidden="true"
                className={pending ? "animate-spin" : undefined}
              />
              Scan watchlist
            </Button>
          </div>

          <ScanCriteriaControls
            filters={filters}
            onFiltersChange={setFilters}
            hiddenInputs
          />
        </form>
      </div>

      {state.message ? (
        <p
          className={cn(
            "text-sm",
            state.ok ? "text-muted-foreground" : "text-destructive",
          )}
        >
          {state.message}
        </p>
      ) : null}

      {!result ? (
        <ScanEmptyState symbolCount={symbolCount} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <ScanMetric label="Symbols scanned" value={result.scannedSymbols} />
            <ScanMetric label="Candidates" value={result.candidates.length} />
            <ScanMetric label="Failures" value={result.failures.length} />
          </div>
          {result.failures.length > 0 ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <h3 className="text-sm font-semibold text-destructive">
                Failed symbols
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {result.failures.map((failure) => (
                  <li key={failure.ticker}>
                    <span className="font-mono text-foreground">
                      {failure.ticker}
                    </span>{" "}
                    {failure.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <WatchlistCandidatesTable
            candidates={result.candidates}
            sort={sort}
            onSort={setSortColumn}
          />
        </>
      )}
    </section>
  );
}

function ScanEmptyState({ symbolCount }: { symbolCount: number }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
      <div className="max-w-sm">
        <h2 className="text-lg font-semibold">
          {symbolCount === 0 ? "No symbols to scan" : "No scan run yet"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {symbolCount === 0
            ? "Add tickers to the watchlist before starting a scan."
            : "Start a scan to fetch option chains and compare candidates."}
        </p>
      </div>
    </div>
  );
}

function ScanMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
    </div>
  );
}

function WatchlistCandidatesTable({
  candidates,
  sort,
  onSort,
}: {
  candidates: WatchlistScanCandidate[];
  sort: { column: SortColumn; dir: SortDirection };
  onSort: (column: SortColumn) => void;
}) {
  const sortedCandidates = useMemo(() => {
    return [...candidates].sort((left, right) => compare(left, right, sort));
  }, [candidates, sort]);

  if (candidates.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
        <div className="max-w-sm">
          <h2 className="text-lg font-semibold">No candidates found</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The saved symbols scanned successfully, but no setups matched the
            default criteria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
          <TableRow>
            <SortableHeader column="ticker" sort={sort} onSort={onSort}>
              Ticker
            </SortableHeader>
            <SortableHeader column="strategy" sort={sort} onSort={onSort}>
              Strategy
            </SortableHeader>
            <SortableHeader column="expiration" sort={sort} onSort={onSort}>
              Expiration
            </SortableHeader>
            <TableHead>Strikes</TableHead>
            <SortableHeader
              column="score"
              sort={sort}
              onSort={onSort}
              align="right"
            >
              Score
            </SortableHeader>
            <SortableHeader
              column="maxProfit"
              sort={sort}
              onSort={onSort}
              align="right"
            >
              Max Profit
            </SortableHeader>
            <SortableHeader
              column="maxLoss"
              sort={sort}
              onSort={onSort}
              align="right"
            >
              Max Loss
            </SortableHeader>
            <SortableHeader
              column="returnOnRisk"
              sort={sort}
              onSort={onSort}
              align="right"
            >
              Return on Risk
            </SortableHeader>
            <SortableHeader
              column="probabilityOfProfit"
              sort={sort}
              onSort={onSort}
              align="right"
            >
              Probability of Profit
            </SortableHeader>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCandidates.map((candidate) => (
            <CandidateRow candidate={candidate} key={candidate.id} />
          ))}
        </TableBody>
      </Table>
    </section>
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
        type="button"
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
  return column === "ticker" || column === "strategy" || column === "expiration"
    ? "asc"
    : "desc";
}

function compare(
  left: WatchlistScanCandidate,
  right: WatchlistScanCandidate,
  sort: { column: SortColumn; dir: SortDirection },
) {
  const sign = sort.dir === "asc" ? 1 : -1;

  switch (sort.column) {
    case "ticker":
      return sign * left.ticker.localeCompare(right.ticker);
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

function CandidateRow({ candidate }: { candidate: WatchlistScanCandidate }) {
  const bias = STRATEGY_BIAS[candidate.state.strategy];
  const ror = candidate.summary.returnOnRisk;

  return (
    <TableRow>
      <TableCell className="font-mono font-semibold">
        {candidate.ticker}
      </TableCell>
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
        {candidate.summary.strikes.map((strike) => `$${strike}`).join(" / ")}
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
      <TableCell className="text-right font-mono font-semibold tabular-nums">
        {ror === null ? "n/a" : formatPercent(ror)}
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

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
