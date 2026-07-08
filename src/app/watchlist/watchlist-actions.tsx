"use client";

import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { RiskRewardCandidatesTable } from "@/components/risk-reward-candidates-table";
import {
  defaultRiskRewardSortDirection,
  type RiskRewardSort,
  type RiskRewardSortColumn,
} from "@/components/risk-reward-candidates-table-model";
import {
  createDefaultScanFilters,
  ScanCriteriaControls,
  type ScanFilters,
} from "@/components/scan-criteria-controls";
import { TickerCombobox } from "@/components/ticker-combobox";
import { Button } from "@/components/ui/button";
import {
  addWatchlistSymbolAction,
  removeWatchlistSymbolAction,
  scanWatchlistAction,
  type WatchlistActionState,
  type WatchlistScanActionState,
} from "@/lib/ticker-watchlist-actions";
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

const WATCHLIST_PAGE_SIZE = 30;

export function WatchlistScanner({ symbolCount }: { symbolCount: number }) {
  const [state, action, pending] = useActionState(
    scanWatchlistAction,
    INITIAL_SCAN_STATE,
  );
  const [filters, setFilters] = useState<ScanFilters>(createDefaultScanFilters);
  const [sort, setSort] = useState<RiskRewardSort>({
    column: "score",
    dir: "desc",
  });
  const [page, setPage] = useState(0);
  const result = state.result;

  function setSortColumn(column: RiskRewardSortColumn) {
    setPage(0);
    setSort((current) =>
      current.column === column
        ? { column, dir: current.dir === "asc" ? "desc" : "asc" }
        : { column, dir: defaultRiskRewardSortDirection(column) },
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
          <RiskRewardCandidatesTable
            candidates={result.candidates}
            sort={sort}
            onSort={setSortColumn}
            showTicker
            page={page}
            pageSize={WATCHLIST_PAGE_SIZE}
            onPageChange={setPage}
            className="rounded-lg border-border shadow-none"
            emptyState={
              <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
                <div className="max-w-sm">
                  <h2 className="text-lg font-semibold">No candidates found</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    The saved symbols scanned successfully, but no setups
                    matched the selected criteria.
                  </p>
                </div>
              </div>
            }
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
