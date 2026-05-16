import { describe, expect, it } from "vitest";
import { createGeneratedChain } from "@/lib/options";
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

  it("returns an empty result when no symbols are provided", async () => {
    const result = await scanTickerWatchlist([], undefined, new TestProvider());

    expect(result).toEqual({
      scannedSymbols: 0,
      candidates: [],
      failures: [],
    });
  });
});
