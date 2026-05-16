"use server";

import { revalidatePath } from "next/cache";
import {
  addWatchlistSymbol,
  listWatchlistSymbols,
  removeWatchlistSymbol,
} from "@/lib/ticker-watchlist";
import {
  scanTickerWatchlist,
  type WatchlistScanResult,
} from "@/lib/ticker-watchlist-scan";

export type WatchlistActionState = {
  ok: boolean;
  message: string | null;
};

export type WatchlistScanActionState = {
  ok: boolean;
  message: string | null;
  result: WatchlistScanResult | null;
};

export async function addWatchlistSymbolAction(
  _previousState: WatchlistActionState,
  formData: FormData,
): Promise<WatchlistActionState> {
  const symbol = formData.get("symbol");

  if (typeof symbol !== "string") {
    return { ok: false, message: "Enter a ticker symbol." };
  }

  try {
    const added = await addWatchlistSymbol(symbol);
    revalidatePath("/watchlist");
    return { ok: true, message: `${added.symbol} added.` };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not add ticker symbol.",
    };
  }
}

export async function removeWatchlistSymbolAction(
  _previousState: WatchlistActionState,
  formData: FormData,
): Promise<WatchlistActionState> {
  const id = formData.get("id");

  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, message: "Missing watchlist symbol id." };
  }

  try {
    await removeWatchlistSymbol(id);
    revalidatePath("/watchlist");
    return { ok: true, message: "Ticker removed." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not remove ticker symbol.",
    };
  }
}

export async function scanWatchlistAction(
  _previousState: WatchlistScanActionState,
): Promise<WatchlistScanActionState> {
  const symbols = await listWatchlistSymbols();

  if (symbols.length === 0) {
    return {
      ok: false,
      message: "Add at least one ticker before scanning.",
      result: null,
    };
  }

  try {
    const result = await scanTickerWatchlist(
      symbols.map((item) => item.symbol),
    );

    return {
      ok: true,
      message: `Scanned ${result.scannedSymbols} ${
        result.scannedSymbols === 1 ? "symbol" : "symbols"
      }.`,
      result,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not scan ticker watchlist.",
      result: null,
    };
  }
}
