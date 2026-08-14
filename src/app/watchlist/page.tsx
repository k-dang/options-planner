import type { Metadata } from "next";
import { Suspense } from "react";
import { listWatchlistSymbols } from "@/db/ticker-watchlist";
import {
  AddWatchlistSymbolForm,
  RemoveWatchlistSymbolButton,
  WatchlistScanner,
} from "./watchlist-actions";

export const metadata: Metadata = {
  title: "Watchlist",
};

const SKELETON_TAG_WIDTHS = [80, 72, 64, 80, 72].map((width, index) => ({
  id: `skeleton-tag-${index}-${width}`,
  width,
}));

export default function WatchlistPage() {
  return (
    <main>
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
              Ticker Watchlist
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Watchlist
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Track underlyings for opportunity discovery. This list is separate
              from saved strategy positions.
            </p>
          </div>
        </div>

        <Suspense fallback={<WatchlistSkeleton />}>
          <WatchlistContent />
        </Suspense>
      </section>
    </main>
  );
}

async function WatchlistContent() {
  const symbols = await listWatchlistSymbols();

  if (symbols.length === 0) {
    return (
      <>
        <AddWatchlistSymbolForm />
        <EmptyState />
        <WatchlistScanner symbolCount={0} />
      </>
    );
  }

  return (
    <>
      <AddWatchlistSymbolForm />
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Saved tickers</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {symbols.length === 1
                ? "1 symbol in the watchlist"
                : `${symbols.length} symbols in the watchlist`}
            </p>
          </div>
        </div>
        <ul className="divide-y divide-border">
          {symbols.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div>
                <p className="font-mono text-base font-semibold">
                  {item.symbol}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Added {item.createdAt.toLocaleDateString()}
                </p>
              </div>
              <RemoveWatchlistSymbolButton id={item.id} symbol={item.symbol} />
            </li>
          ))}
        </ul>
      </section>
      <WatchlistScanner symbolCount={symbols.length} />
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
      <div className="max-w-sm">
        <h2 className="text-lg font-semibold">No watchlist symbols</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Add tickers to build a discovery list. Market data scans will only run
          after you start one.
        </p>
      </div>
    </div>
  );
}

function WatchlistSkeleton() {
  return (
    // Wrapper carries the gap the parent used to apply between the fragment's
    // three children, so the skeleton lines up with the resolved content.
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading watchlist"
      className="flex flex-col gap-6"
    >
      {/* AddWatchlistSymbolForm */}
      <div className="flex w-full max-w-md flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="h-9 flex-1 rounded-md bg-muted" />
          <div className="h-9 w-20 rounded-md bg-muted" />
        </div>
        <div className="h-3 w-0" />
      </div>

      {/* Saved tickers card */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="space-y-1.5">
            <div className="h-3.5 w-24 rounded bg-muted" />
            <div className="h-3 w-36 rounded bg-muted/60" />
          </div>
        </div>
        <ul className="divide-y divide-border">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="space-y-1.5">
                <div className="h-4 w-14 rounded bg-muted" />
                <div className="h-3 w-28 rounded bg-muted/60" />
              </div>
              <div className="h-7 w-7 rounded bg-muted/40" />
            </li>
          ))}
        </ul>
      </div>

      {/* WatchlistScanner card */}
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 rounded bg-muted" />
              <div className="h-3 w-64 rounded bg-muted/60" />
            </div>
            <div className="h-9 w-36 rounded-md bg-muted" />
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <div className="h-3 w-48 rounded bg-muted/60" />
              <div className="h-11 rounded-2xl bg-muted/40" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="h-3 w-48 rounded bg-muted/60" />
              <div className="h-11 rounded-2xl bg-muted/40" />
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-center gap-3">
              <div className="h-3 w-20 rounded bg-muted/60" />
            </div>
            <div className="flex flex-wrap gap-2">
              {SKELETON_TAG_WIDTHS.map(({ id, width }) => (
                <div
                  key={id}
                  className="h-6 rounded bg-muted/50"
                  style={{ width: `${width}px` }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="min-h-48 rounded-lg border border-dashed border-border bg-card/40" />
      </div>

      <span className="sr-only">Loading watchlist</span>
    </div>
  );
}
