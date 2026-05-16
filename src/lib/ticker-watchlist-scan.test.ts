import { describe, expect, it } from "vitest";
import {
  createGeneratedChain,
  parseBuilderState,
  scanRiskReward,
} from "@/lib/options";
import type {
  OptionChainProvider,
  OptionChainRequest,
  OptionChainSnapshot,
} from "@/lib/options/types";
import { scanTickerWatchlist } from "./ticker-watchlist-scan";

class TestProvider implements OptionChainProvider {
  constructor(private readonly failingSymbols = new Set<string>()) {}

  async getChain(input: OptionChainRequest): Promise<OptionChainSnapshot> {
    const symbol = input.symbol.toUpperCase();

    if (this.failingSymbols.has(symbol)) {
      throw new Error(`${symbol} provider failed`);
    }

    return createGeneratedChain(symbol);
  }
}

describe("ticker watchlist scan", () => {
  it("combines successful ticker results and includes ticker identity", async () => {
    const result = await scanTickerWatchlist(
      ["aapl", "msft"],
      undefined,
      new TestProvider(),
    );

    expect(result.scannedSymbols).toBe(2);
    expect(result.failures).toEqual([]);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(new Set(result.candidates.map((item) => item.ticker))).toEqual(
      new Set(["AAPL", "MSFT"]),
    );
    expect(
      result.candidates.every(
        (candidate) => candidate.state.symbol === candidate.ticker,
      ),
    ).toBe(true);
  });

  it("keeps at most ten candidates per ticker", async () => {
    const result = await scanTickerWatchlist(
      ["AAPL", "MSFT"],
      undefined,
      new TestProvider(),
    );
    const counts = result.candidates.reduce(
      (byTicker, candidate) => {
        byTicker[candidate.ticker] = (byTicker[candidate.ticker] ?? 0) + 1;
        return byTicker;
      },
      {} as Record<string, number>,
    );

    expect(counts.AAPL).toBeLessThanOrEqual(10);
    expect(counts.MSFT).toBeLessThanOrEqual(10);
  });

  it("returns partial failures without hiding successful candidates", async () => {
    const result = await scanTickerWatchlist(
      ["AAPL", "BAD", "MSFT"],
      undefined,
      new TestProvider(new Set(["BAD"])),
    );

    expect(result.scannedSymbols).toBe(3);
    expect(result.failures).toEqual([
      { ticker: "BAD", message: "BAD provider failed" },
    ]);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(new Set(result.candidates.map((item) => item.ticker))).toEqual(
      new Set(["AAPL", "MSFT"]),
    );
  });

  it("applies non-default criteria across multiple symbols", async () => {
    const result = await scanTickerWatchlist(
      ["AAPL", "MSFT"],
      {
        minDaysToExpiration: 1,
        maxDaysToExpiration: 30,
        minProbabilityOfProfit: 0.5,
        enabledStrategies: ["bull-call-spread"],
      },
      new TestProvider(),
    );

    expect(result.scannedSymbols).toBe(2);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(
      result.candidates.every(
        (candidate) =>
          candidate.state.strategy === "bull-call-spread" &&
          (candidate.summary.probabilityOfProfit ?? 0) >= 0.5 &&
          daysToExpiration(
            candidate.state.asOf,
            candidate.summary.expiration,
          ) <= 30,
      ),
    ).toBe(true);
  });

  it("preserves the single-symbol scanner builder handoff state", async () => {
    const provider = new TestProvider();
    const [singleSymbolCandidate] = scanRiskReward({
      symbol: "AAPL",
      minDaysToExpiration: 30,
      maxDaysToExpiration: 60,
      minProbabilityOfProfit: 0.25,
      enabledStrategies: ["bull-call-spread"],
    });
    const result = await scanTickerWatchlist(
      ["AAPL"],
      {
        minDaysToExpiration: 30,
        maxDaysToExpiration: 60,
        minProbabilityOfProfit: 0.25,
        enabledStrategies: ["bull-call-spread"],
      },
      provider,
    );
    const [watchlistCandidate] = result.candidates;

    expect(singleSymbolCandidate).toBeDefined();
    expect(watchlistCandidate).toBeDefined();

    if (!singleSymbolCandidate || !watchlistCandidate) {
      return;
    }

    expect(watchlistCandidate.summary.builderHref).toBe(
      singleSymbolCandidate.summary.builderHref,
    );
    expect(parseBuilderHref(watchlistCandidate.summary.builderHref)).toEqual(
      watchlistCandidate.state,
    );
  });

  it("returns an empty result when no symbols are provided", async () => {
    const result = await scanTickerWatchlist([], undefined, new TestProvider());

    expect(result).toEqual({
      scannedSymbols: 0,
      candidates: [],
      failures: [],
    });
  });
});

function parseBuilderHref(builderHref: string) {
  const url = new URL(builderHref, "https://example.test");
  const [, , strategy, symbol] = url.pathname.split("/");

  return parseBuilderState({
    strategy,
    symbol,
    expiration: url.searchParams.get("exp") ?? undefined,
    strike: url.searchParams.get("strike") ?? undefined,
    strike2: url.searchParams.get("strike2") ?? undefined,
    quantity: url.searchParams.get("qty") ?? undefined,
  });
}

function daysToExpiration(asOfIso: string, expirationIso: string) {
  const start = new Date(asOfIso);
  const end = new Date(`${expirationIso}T20:00:00.000Z`);

  return Math.max(
    Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
    0,
  );
}
