import { asc, eq } from "drizzle-orm";
import { getDb, watchlistSymbols } from "@/db";

export type WatchlistSymbolItem = {
  id: string;
  symbol: string;
  createdAt: Date;
};

export function normalizeWatchlistSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

export async function listWatchlistSymbols(): Promise<WatchlistSymbolItem[]> {
  const db = getDb();

  return db
    .select({
      id: watchlistSymbols.id,
      symbol: watchlistSymbols.symbol,
      createdAt: watchlistSymbols.createdAt,
    })
    .from(watchlistSymbols)
    .orderBy(asc(watchlistSymbols.createdAt), asc(watchlistSymbols.symbol));
}

export async function addWatchlistSymbol(symbol: string) {
  const normalized = normalizeWatchlistSymbol(symbol);

  if (!normalized) {
    throw new Error("Enter a ticker symbol.");
  }

  const db = getDb();
  const [inserted] = await db
    .insert(watchlistSymbols)
    .values({ symbol: normalized })
    .onConflictDoNothing({ target: watchlistSymbols.symbol })
    .returning({
      id: watchlistSymbols.id,
      symbol: watchlistSymbols.symbol,
      createdAt: watchlistSymbols.createdAt,
    });

  if (!inserted) {
    throw new Error(`${normalized} is already in the ticker watchlist.`);
  }

  return inserted;
}

export async function removeWatchlistSymbol(id: string) {
  const db = getDb();
  const [deleted] = await db
    .delete(watchlistSymbols)
    .where(eq(watchlistSymbols.id, id))
    .returning({ id: watchlistSymbols.id });

  if (!deleted) {
    throw new Error("Watchlist symbol was not found.");
  }

  return deleted;
}
