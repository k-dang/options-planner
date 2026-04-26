import { describe, expect, it } from "vitest";
import { GeneratedChainProvider } from "./index";

describe("GeneratedChainProvider", () => {
  it("creates deterministic weekly and monthly-looking chains with sane quotes", () => {
    const chain = new GeneratedChainProvider().getChain(
      "aapl",
      new Date("2026-04-24T16:00:00.000Z"),
    );

    expect(chain.underlying).toEqual({
      symbol: "AAPL",
      price: 172,
      asOf: "2026-04-24T16:00:00.000Z",
    });
    expect(
      chain.expirations.map((expiration) => expiration.daysToExpiration),
    ).toEqual([7, 14, 21, 30, 45, 60, 90, 120]);

    const firstExpiration = chain.expirations[0];
    expect(firstExpiration?.calls).toHaveLength(17);
    expect(firstExpiration?.puts).toHaveLength(17);
    expect(firstExpiration?.calls[0]?.strike).toBeLessThan(
      firstExpiration?.calls.at(-1)?.strike ?? 0,
    );

    const atTheMoney = firstExpiration?.calls.find(
      (quote) => quote.strike === 170,
    );
    expect(atTheMoney?.bid).toBeGreaterThan(0);
    expect(atTheMoney?.ask).toBeGreaterThan(atTheMoney?.bid ?? 0);
    expect(atTheMoney?.impliedVolatility).toBeGreaterThan(0.2);
  });
});
