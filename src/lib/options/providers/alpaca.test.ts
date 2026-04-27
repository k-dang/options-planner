import { describe, expect, it } from "vitest";
import { normalizeAlpacaSnapshot } from "./alpaca";

describe("normalizeAlpacaSnapshot", () => {
  it("normalizes Alpaca snapshot fields into app option quotes", () => {
    const quote = normalizeAlpacaSnapshot({
      providerSymbol: "AAPL260515C00175000",
      snapshot: {
        latestQuote: {
          ap: 4.4,
          bp: 4.1,
          t: "2026-04-24T20:00:00Z",
        },
        latestTrade: {
          p: 4.25,
          s: 12,
        },
        impliedVolatility: 0.245,
        greeks: {
          delta: 0.51,
          gamma: 0.03,
          theta: -0.04,
          vega: 0.15,
          rho: 0.05,
        },
      },
    });

    expect(quote).toMatchObject({
      provider: "alpaca",
      providerSymbol: "AAPL260515C00175000",
      optionType: "call",
      expiration: "2026-05-15",
      strike: 175,
      bid: 4.1,
      ask: 4.4,
      mid: 4.25,
      last: 4.25,
      volume: 12,
      impliedVolatility: 0.245,
      delta: 0.51,
      gamma: 0.03,
      theta: -0.04,
      vega: 0.15,
      rho: 0.05,
      updatedAt: "2026-04-24T20:00:00Z",
    });
  });

  it("keeps optional market fields nullable when Alpaca omits them", () => {
    const quote = normalizeAlpacaSnapshot({
      providerSymbol: "AAPL260515P00170000",
      snapshot: {},
    });

    expect(quote).toMatchObject({
      optionType: "put",
      expiration: "2026-05-15",
      strike: 170,
      bid: null,
      ask: null,
      mid: null,
      last: null,
      impliedVolatility: null,
      delta: null,
    });
  });

  it("ignores symbols that do not look like option contracts", () => {
    expect(
      normalizeAlpacaSnapshot({
        providerSymbol: "AAPL",
        snapshot: {},
      }),
    ).toBeNull();
  });
});
