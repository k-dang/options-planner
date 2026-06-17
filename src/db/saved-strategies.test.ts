import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StrategyState } from "@/lib/options";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getOptionChainProvider: vi.fn(),
  savedStrategies: { id: "id", status: "status" },
  strategySnapshots: { strategyId: "strategyId" },
}));

vi.mock("@/db", () => ({
  getDb: mocks.getDb,
  savedStrategies: mocks.savedStrategies,
  strategySnapshots: mocks.strategySnapshots,
}));

vi.mock("@/lib/options/providers/registry", () => ({
  getOptionChainProvider: mocks.getOptionChainProvider,
}));

import { refreshOpenSavedStrategies } from "./saved-strategies";

const PAST_EXPIRATION = "2020-01-17";

function shortPutState(): StrategyState {
  return {
    version: 1,
    strategy: "cash-secured-put",
    symbol: "AAPL",
    underlyingPrice: 172,
    asOf: "2019-12-01T16:00:00.000Z",
    legs: [
      {
        kind: "option",
        optionType: "put",
        side: "short",
        quantity: 1,
        expiration: PAST_EXPIRATION,
        strike: 170,
        premium: 6,
        impliedVolatility: 0.28,
      },
    ],
  };
}

function openStrategyRow() {
  return {
    id: "strat-1",
    symbol: "AAPL",
    status: "open",
    entryState: shortPutState(),
    entrySignedMarkValue: "-600",
    capitalAtRisk: "16400",
  };
}

function mockProvider(underlyingPrice: number) {
  mocks.getOptionChainProvider.mockReturnValue({
    getChain: vi.fn(() =>
      Promise.resolve({
        underlying: {
          symbol: "AAPL",
          price: underlyingPrice,
          asOf: "2020-01-21T16:00:00.000Z",
        },
        expirations: [],
      }),
    ),
  });
}

describe("expiry settlement in the refresh path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("settles a past-expiration strategy and marks it expired", async () => {
    mockProvider(175); // OTM short put → expires worthless, keep the credit

    const batch = vi.fn((_queries: unknown[]) =>
      Promise.resolve([[{ id: "snap-1" }], [{ id: "strat-1" }]]),
    );
    mocks.getDb.mockReturnValue({
      select: () => ({
        from: () => ({ where: () => Promise.resolve([openStrategyRow()]) }),
      }),
      insert: () => ({ values: () => ({ returning: () => "insertQuery" }) }),
      update: () => ({
        set: () => ({ where: () => ({ returning: () => "updateQuery" }) }),
      }),
      batch,
    });

    const results = await refreshOpenSavedStrategies();

    expect(results).toEqual([{ id: "strat-1", ok: true, message: null }]);
    expect(batch).toHaveBeenCalledTimes(1);

    // Settlement writes one snapshot and one strategy-status update.
    const batchArgs = batch.mock.calls[0][0];
    expect(batchArgs).toHaveLength(2);
  });

  it("does not settle when the underlying price is unavailable", async () => {
    mockProvider(0); // unavailable price (estimate fallback) must not settle

    const batch = vi.fn();
    mocks.getDb.mockReturnValue({
      select: () => ({
        from: () => ({ where: () => Promise.resolve([openStrategyRow()]) }),
      }),
      insert: () => ({ values: () => ({ returning: () => "insertQuery" }) }),
      update: () => ({
        set: () => ({ where: () => ({ returning: () => "updateQuery" }) }),
      }),
      batch,
    });

    const results = await refreshOpenSavedStrategies();

    expect(results[0].ok).toBe(false);
    expect(results[0].message).toBe(
      "Underlying price unavailable for expiry settlement.",
    );
    expect(batch).not.toHaveBeenCalled();
  });
});
