import { normalizeWatchlistSymbol } from "@/db/ticker-watchlist";
import {
  type OptimizerCandidate,
  type ScanInputs,
  scanRiskReward,
  strategyTemplates,
} from "@/lib/options";
import { getOptionChainProvider } from "@/lib/options/providers/registry";
import type { OptionChainProvider } from "@/lib/options/types";

export type WatchlistScanCriteria = Pick<
  ScanInputs,
  "minDaysToExpiration" | "maxDaysToExpiration" | "minProbabilityOfProfit"
> & {
  enabledStrategies: ScanInputs["enabledStrategies"];
};

export type WatchlistScanCandidate = OptimizerCandidate & {
  ticker: string;
};

export type WatchlistScanFailure = {
  ticker: string;
  message: string;
};

export type WatchlistScanResult = {
  scannedSymbols: number;
  candidates: WatchlistScanCandidate[];
  failures: WatchlistScanFailure[];
};

export const DEFAULT_WATCHLIST_SCAN_CRITERIA: WatchlistScanCriteria = {
  minDaysToExpiration: 30,
  maxDaysToExpiration: 60,
  minProbabilityOfProfit: 0.25,
  enabledStrategies: [...strategyTemplates.ids()],
};

const MAX_CANDIDATES_PER_TICKER = 10;

export async function scanTickerWatchlist(
  symbols: string[],
  criteria: WatchlistScanCriteria = DEFAULT_WATCHLIST_SCAN_CRITERIA,
  provider: OptionChainProvider = getOptionChainProvider(),
): Promise<WatchlistScanResult> {
  const normalizedSymbols = uniqueSymbols(symbols);
  const settled = await Promise.allSettled(
    normalizedSymbols.map(async (ticker) => {
      const chain = await provider.getChain({ symbol: ticker });
      const candidates = scanRiskReward(
        {
          symbol: ticker,
          ...criteria,
        },
        chain,
      )
        .slice(0, MAX_CANDIDATES_PER_TICKER)
        .map((candidate) => ({
          ...candidate,
          ticker,
        }));

      return { ticker, candidates };
    }),
  );

  const candidates: WatchlistScanCandidate[] = [];
  const failures: WatchlistScanFailure[] = [];

  settled.forEach((result, index) => {
    const ticker = normalizedSymbols[index] ?? "UNKNOWN";

    if (result.status === "fulfilled") {
      candidates.push(...result.value.candidates);
      return;
    }

    failures.push({
      ticker,
      message:
        result.reason instanceof Error
          ? result.reason.message
          : "Could not scan ticker.",
    });
  });

  return {
    scannedSymbols: normalizedSymbols.length,
    candidates,
    failures,
  };
}

function uniqueSymbols(symbols: string[]) {
  return [
    ...new Set(
      symbols.flatMap((symbol) => {
        const normalized = normalizeWatchlistSymbol(symbol);
        return normalized ? [normalized] : [];
      }),
    ),
  ];
}
