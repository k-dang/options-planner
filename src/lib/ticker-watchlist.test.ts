import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  watchlistSymbols: {
    id: "id",
    symbol: "symbol",
    createdAt: "createdAt",
  },
}));

vi.mock("@/db", () => ({
  getDb: mocks.getDb,
  watchlistSymbols: mocks.watchlistSymbols,
}));

import {
  addWatchlistSymbol,
  listWatchlistSymbols,
  normalizeWatchlistSymbol,
  removeWatchlistSymbol,
} from "./ticker-watchlist";

function queryResult<T>(result: T) {
  return {
    from: vi.fn().mockReturnThis(),
    orderBy: vi.fn(() => Promise.resolve(result)),
    where: vi.fn().mockReturnThis(),
  };
}

describe("ticker watchlist persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes symbols to uppercase without surrounding whitespace", () => {
    expect(normalizeWatchlistSymbol(" aapl ")).toBe("AAPL");
  });

  it("lists symbols in persisted order", async () => {
    const rows = [
      { id: "watch-1", symbol: "AAPL", createdAt: new Date("2026-01-01") },
      { id: "watch-2", symbol: "MSFT", createdAt: new Date("2026-01-02") },
    ];
    const selectQuery = queryResult(rows);
    const db = {
      select: vi.fn(() => selectQuery),
    };
    mocks.getDb.mockReturnValue(db);

    await expect(listWatchlistSymbols()).resolves.toEqual(rows);
    expect(db.select).toHaveBeenCalledWith({
      id: mocks.watchlistSymbols.id,
      symbol: mocks.watchlistSymbols.symbol,
      createdAt: mocks.watchlistSymbols.createdAt,
    });
    expect(selectQuery.from).toHaveBeenCalledWith(mocks.watchlistSymbols);
    expect(selectQuery.orderBy).toHaveBeenCalledTimes(1);
  });

  it("adds a normalized uppercase symbol", async () => {
    const inserted = {
      id: "watch-1",
      symbol: "AAPL",
      createdAt: new Date("2026-01-01"),
    };
    const db = {
      insert: vi.fn(() => ({
        values: vi.fn((values) => {
          expect(values).toEqual({ symbol: "AAPL" });
          return {
            onConflictDoNothing: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve([inserted])),
            })),
          };
        }),
      })),
    };
    mocks.getDb.mockReturnValue(db);

    await expect(addWatchlistSymbol(" aapl ")).resolves.toEqual(inserted);
    expect(db.insert).toHaveBeenCalledWith(mocks.watchlistSymbols);
  });

  it("prevents duplicate symbols", async () => {
    const db = {
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoNothing: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    };
    mocks.getDb.mockReturnValue(db);

    await expect(addWatchlistSymbol("aapl")).rejects.toThrow(
      "AAPL is already in the ticker watchlist.",
    );
  });

  it("removes a persisted symbol by id", async () => {
    const db = {
      delete: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: "watch-1" }])),
        })),
      })),
    };
    mocks.getDb.mockReturnValue(db);

    await expect(removeWatchlistSymbol("watch-1")).resolves.toEqual({
      id: "watch-1",
    });
    expect(db.delete).toHaveBeenCalledWith(mocks.watchlistSymbols);
  });
});
