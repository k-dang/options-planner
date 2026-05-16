"use client";

import { Plus, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { BiasBadge, STRATEGY_BIAS } from "@/components/bias-badge";
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
  const result = state.result;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Risk/Reward scan</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Scans run only when started and use the default scanner criteria.
          </p>
        </div>
        <form action={action}>
          <Button type="submit" disabled={pending || symbolCount === 0}>
            <RefreshCw
              aria-hidden="true"
              className={pending ? "animate-spin" : undefined}
            />
            Scan watchlist
          </Button>
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
          <WatchlistCandidatesTable candidates={result.candidates} />
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
}: {
  candidates: WatchlistScanCandidate[];
}) {
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
            <TableHead>Ticker</TableHead>
            <TableHead>Strategy</TableHead>
            <TableHead>Expiration</TableHead>
            <TableHead>Strikes</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead className="text-right">Max Profit</TableHead>
            <TableHead className="text-right">Max Loss</TableHead>
            <TableHead className="text-right">Return on Risk</TableHead>
            <TableHead className="text-right">Probability of Profit</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((candidate) => (
            <CandidateRow candidate={candidate} key={candidate.id} />
          ))}
        </TableBody>
      </Table>
    </section>
  );
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
