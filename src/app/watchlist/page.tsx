import { Suspense } from "react";
import { listWatchlistSymbols } from "@/db/ticker-watchlist";
import {
  AddWatchlistSymbolForm,
  RemoveWatchlistSymbolButton,
  WatchlistScanner,
} from "./watchlist-actions";

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
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="mt-4 space-y-3">
        <div className="h-12 rounded bg-muted/60" />
        <div className="h-12 rounded bg-muted/40" />
      </div>
    </div>
  );
}
