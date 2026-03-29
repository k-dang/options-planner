import { describe, expect, it } from "vitest";
import type { BuilderState, OptionChain, UnderlyingQuote } from "@/domain";
import { calculateStrategyAnalytics } from "./analytics";

const quote: UnderlyingQuote = {
  symbol: "AAPL",
  name: "Apple Inc.",
  last: 212.5,
  bid: 212.45,
  ask: 212.55,
  previousClose: 210,
  currency: "USD",
};

const chain: OptionChain = {
  symbol: "AAPL",
  expiry: "2026-04-17",
  underlyingPrice: 212.5,
  contracts: [
    {
      strike: 212.5,
      right: "C",
      contractSymbol: "AAPL260417C00212500",
      exerciseStyle: "american",
      multiplier: 100,
      bid: 6.2,
      ask: 6.35,
      mark: 6.28,
      iv: 0.28,
      volume: 1843,
      openInterest: 12355,
      delta: 0.55,
      gamma: 0.04,
      theta: -0.09,
      vega: 0.12,
      rho: 0.04,
    },
    {
      strike: 212.5,
      right: "P",
      contractSymbol: "AAPL260417P00212500",
      exerciseStyle: "american",
      multiplier: 100,
      bid: 3.1,
      ask: 3.25,
      mark: 3.18,
      iv: 0.29,
      volume: 1714,
      openInterest: 11192,
      delta: -0.45,
      gamma: 0.04,
      theta: -0.08,
      vega: 0.11,
      rho: -0.03,
    },
    {
      strike: 222.5,
      right: "C",
      contractSymbol: "AAPL260417C00222500",
      exerciseStyle: "american",
      multiplier: 100,
      bid: 2.55,
      ask: 2.71,
      mark: 2.63,
      iv: 0.285,
      volume: 1288,
      openInterest: 8741,
      delta: 0.34,
      gamma: 0.038,
      theta: -0.073,
      vega: 0.108,
      rho: 0.025,
    },
  ],
};

function builderState(legs: BuilderState["legs"]): BuilderState {
  return {
    symbol: "AAPL",
    horizonDays: 30,
    riskFreeRate: 0.04,
    commissions: { perContract: 0.65, perLegFee: 0.1 },
    ivOverrides: { byExpiry: {} },
    grid: { pricePoints: 5, datePoints: 3, priceRangePct: 0.2 },
    legs,
  };
}

describe("calculateStrategyAnalytics", () => {
  it("returns a stable analytics shape for a long call", () => {
    const result = calculateStrategyAnalytics({
      builderState: builderState([
        {
          kind: "option",
          side: "buy",
          qty: 1,
          right: "C",
          strike: 212.5,
          expiry: "2026-04-17",
          entryPriceMode: "mark",
        },
      ]),
      quote,
      chainsByExpiry: { "2026-04-17": chain },
      valuationDate: new Date("2026-03-20T00:00:00Z"),
    });

    expect(result.grid.prices).toHaveLength(5);
    expect(result.grid.dates).toHaveLength(3);
    expect(result.grid.values).toHaveLength(5);
    expect(result.chart.series).toHaveLength(5);
    expect(result.summary.netDebitOrCredit).toBeGreaterThan(0);
    expect(result.summary.maxProfit).toBeNull();
    expect(result.summary.maxLoss).toBeGreaterThan(0);
    expect(result.summary.breakevens.length).toBeGreaterThan(0);
    expect(result.summary.chanceOfProfitAtHorizon).toBeGreaterThanOrEqual(0);
    expect(result.summary.chanceOfProfitAtHorizon).toBeLessThanOrEqual(1);
    expect(result.summary.netGreeks.delta).toBeGreaterThan(0);
  });

  it("produces a finite max profit for a bull call spread", () => {
    const result = calculateStrategyAnalytics({
      builderState: builderState([
        {
          kind: "option",
          side: "buy",
          qty: 1,
          right: "C",
          strike: 212.5,
          expiry: "2026-04-17",
          entryPriceMode: "mark",
        },
        {
          kind: "option",
          side: "sell",
          qty: 1,
          right: "C",
          strike: 222.5,
          expiry: "2026-04-17",
          entryPriceMode: "mark",
        },
      ]),
      quote,
      chainsByExpiry: { "2026-04-17": chain },
      valuationDate: new Date("2026-03-20T00:00:00Z"),
    });

    expect(result.summary.maxProfit).not.toBeNull();
    expect(result.summary.maxProfit).toBeGreaterThan(0);
    expect(result.summary.maxLoss).toBeGreaterThan(0);
    expect(Math.abs(result.summary.netGreeks.delta)).toBeLessThan(100);
  });

  it("uses IV overrides in implied move calculations", () => {
    const base = calculateStrategyAnalytics({
      builderState: builderState([
        {
          kind: "option",
          side: "buy",
          qty: 1,
          right: "C",
          strike: 212.5,
          expiry: "2026-04-17",
          entryPriceMode: "mark",
        },
      ]),
      quote,
      chainsByExpiry: { "2026-04-17": chain },
      valuationDate: new Date("2026-03-20T00:00:00Z"),
    });

    const stressed = calculateStrategyAnalytics({
      builderState: {
        ...builderState([
          {
            kind: "option",
            side: "buy",
            qty: 1,
            right: "C",
            strike: 212.5,
            expiry: "2026-04-17",
            entryPriceMode: "mark",
          },
        ]),
        ivOverrides: { global: 0.5, byExpiry: {} },
      },
      quote,
      chainsByExpiry: { "2026-04-17": chain },
      valuationDate: new Date("2026-03-20T00:00:00Z"),
    });

    expect(stressed.chart.impliedMove1x.up).toBeGreaterThan(base.chart.impliedMove1x.up);
    expect(stressed.chart.impliedMove1x.down).toBeLessThan(base.chart.impliedMove1x.down);
  });
});
