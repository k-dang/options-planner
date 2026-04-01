import { describe, expect, it } from "vitest";
import type { OptionChain, UnderlyingQuote } from "@/modules/market/schemas";
import { runOptimizer } from "./optimizer";
import type { OptimizerRequest } from "./schemas";

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
      strike: 202.5,
      right: "C",
      contractSymbol: "AAPL260417C00202500",
      exerciseStyle: "american",
      multiplier: 100,
      bid: 10.5,
      ask: 10.8,
      mark: 10.65,
      iv: 0.28,
      volume: 1200,
      openInterest: 8000,
      delta: 0.72,
      gamma: 0.04,
      theta: -0.09,
      vega: 0.12,
      rho: 0.08,
    },
    {
      strike: 212.5,
      right: "C",
      contractSymbol: "AAPL260417C00212500",
      exerciseStyle: "american",
      multiplier: 100,
      bid: 6.2,
      ask: 6.35,
      mark: 6.28,
      iv: 0.284,
      volume: 1104,
      openInterest: 7600,
      delta: 0.52,
      gamma: 0.04,
      theta: -0.09,
      vega: 0.12,
      rho: 0.05,
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
      iv: 0.288,
      volume: 1008,
      openInterest: 7200,
      delta: 0.34,
      gamma: 0.04,
      theta: -0.09,
      vega: 0.12,
      rho: 0.03,
    },
    {
      strike: 202.5,
      right: "P",
      contractSymbol: "AAPL260417P00202500",
      exerciseStyle: "american",
      multiplier: 100,
      bid: 2.85,
      ask: 3,
      mark: 2.92,
      iv: 0.293,
      volume: 1200,
      openInterest: 8000,
      delta: -0.72,
      gamma: 0.04,
      theta: -0.08,
      vega: 0.11,
      rho: -0.08,
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
      iv: 0.297,
      volume: 1104,
      openInterest: 7600,
      delta: -0.52,
      gamma: 0.04,
      theta: -0.08,
      vega: 0.11,
      rho: -0.05,
    },
    {
      strike: 222.5,
      right: "P",
      contractSymbol: "AAPL260417P00222500",
      exerciseStyle: "american",
      multiplier: 100,
      bid: 7.8,
      ask: 8.05,
      mark: 7.92,
      iv: 0.301,
      volume: 1008,
      openInterest: 7200,
      delta: -0.34,
      gamma: 0.04,
      theta: -0.08,
      vega: 0.11,
      rho: -0.03,
    },
  ],
};

function request(overrides: Partial<OptimizerRequest> = {}): OptimizerRequest {
  return {
    symbol: "AAPL",
    targetPrice: 225,
    targetDate: "2026-04-17",
    objective: "expectedProfit",
    maxLegs: 2,
    strikeWindow: 2,
    horizonDays: 30,
    riskFreeRate: 0.04,
    commissions: { perContract: 0.65, perLegFee: 0.1 },
    ivOverrides: { byExpiry: {} },
    grid: { pricePoints: 7, datePoints: 3, priceRangePct: 0.25 },
    ...overrides,
  };
}

describe("runOptimizer", () => {
  it("returns deterministic candidates across the first four strategy types", () => {
    const candidates = runOptimizer({
      request: request(),
      quote,
      chainsByExpiry: { "2026-04-17": chain },
      valuationDate: new Date("2026-03-20T00:00:00Z"),
    });

    expect(candidates.length).toBeGreaterThan(0);
    expect(
      new Set(candidates.map((candidate) => candidate.strategyName)),
    ).toEqual(
      new Set(["Long Call", "Long Put", "Bull Call Spread", "Bear Put Spread"]),
    );
    expect(candidates[0].objectiveValue).toBeGreaterThanOrEqual(
      candidates[candidates.length - 1].objectiveValue,
    );
  });

  it("filters out candidates that breach maxLoss", () => {
    const candidates = runOptimizer({
      request: request({ maxLoss: 200 }),
      quote,
      chainsByExpiry: { "2026-04-17": chain },
      valuationDate: new Date("2026-03-20T00:00:00Z"),
    });

    expect(
      candidates.every(
        (candidate) =>
          candidate.summary.maxLoss === null ||
          candidate.summary.maxLoss <= 200,
      ),
    ).toBe(true);
  });

  it("can rank by chance of profit", () => {
    const candidates = runOptimizer({
      request: request({ objective: "chanceOfProfit" }),
      quote,
      chainsByExpiry: { "2026-04-17": chain },
      valuationDate: new Date("2026-03-20T00:00:00Z"),
    });

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].objectiveValue).toBe(
      candidates[0].summary.chanceOfProfitAtExpiration,
    );
  });

  it("keeps expected-profit rankings independent of the chart grid", () => {
    const coarseGridCandidates = runOptimizer({
      request: request({
        targetPrice: 218,
        grid: { pricePoints: 3, datePoints: 3, priceRangePct: 0.1 },
      }),
      quote,
      chainsByExpiry: { "2026-04-17": chain },
      valuationDate: new Date("2026-03-20T00:00:00Z"),
    });
    const fineGridCandidates = runOptimizer({
      request: request({
        targetPrice: 218,
        grid: { pricePoints: 31, datePoints: 3, priceRangePct: 0.45 },
      }),
      quote,
      chainsByExpiry: { "2026-04-17": chain },
      valuationDate: new Date("2026-03-20T00:00:00Z"),
    });

    expect(candidateSignatures(coarseGridCandidates)).toEqual(
      candidateSignatures(fineGridCandidates),
    );
    expect(
      coarseGridCandidates.map((candidate) => candidate.expectedProfitAtTarget),
    ).toEqual(
      fineGridCandidates.map((candidate) => candidate.expectedProfitAtTarget),
    );
    expect(
      coarseGridCandidates.map((candidate) => candidate.objectiveValue),
    ).toEqual(fineGridCandidates.map((candidate) => candidate.objectiveValue));
  });
});

function candidateSignatures(candidates: ReturnType<typeof runOptimizer>) {
  return candidates.map(
    (candidate) =>
      `${candidate.strategyName}:${candidate.legs
        .map(
          (leg) =>
            `${leg.side}-${leg.right ?? "S"}-${leg.strike ?? 0}-${leg.expiry ?? ""}`,
        )
        .join("|")}`,
  );
}
