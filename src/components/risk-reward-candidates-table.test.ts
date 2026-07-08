import { describe, expect, it } from "vitest";
import {
  defaultRiskRewardSortDirection,
  formatExpectedMoveCushion,
  type RiskRewardCandidate,
  sortRiskRewardCandidates,
} from "./risk-reward-candidates-table-model";

function candidate(
  id: string,
  expectedMoveCushion: number | null,
): RiskRewardCandidate {
  const state: RiskRewardCandidate["state"] = {
    version: 1,
    strategy: "long-call",
    symbol: id,
    underlyingPrice: 100,
    asOf: "2026-07-07T16:00:00.000Z",
    legs: [],
  };

  return {
    id,
    state,
    evaluation: {
      state,
      netPremium: 0,
      maxProfit: null,
      maxLoss: null,
      breakevens: [],
      probabilityOfProfit: null,
      legs: [],
      greeks: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 },
      payoff: [],
    },
    summary: {
      strategyLabel: "long call",
      expiration: "2026-07-11",
      strikes: [],
      netPremium: 0,
      maxProfit: null,
      maxLoss: null,
      probabilityOfProfit: null,
      delta: 0,
      targetUnderlyingPrice: 100,
      targetProfitLoss: 0,
      returnProfitBasis: 0,
      returnProfitBasisLabel: "max-profit",
      riskDenominator: null,
      returnOnRisk: null,
      expectedMoveCushion,
      score: 0,
      builderHref: "/build/long-call/AAPL",
    },
  };
}

describe("RiskRewardCandidatesTable helpers", () => {
  it("formats Expected Move Cushion as a signed multiple or n/a", () => {
    expect(formatExpectedMoveCushion(1.44)).toBe("+1.4x");
    expect(formatExpectedMoveCushion(-0.64)).toBe("-0.6x");
    expect(formatExpectedMoveCushion(null)).toBe("n/a");
  });

  it("sorts Expected Move Cushion by descending signed value with unavailable values last", () => {
    const sorted = sortRiskRewardCandidates(
      [
        candidate("unavailable", null),
        candidate("negative", -0.6),
        candidate("positive", 1.4),
        candidate("breakeven", 0),
      ],
      { column: "expectedMoveCushion", dir: "desc" },
    );

    expect(sorted.map((item) => item.id)).toEqual([
      "positive",
      "breakeven",
      "negative",
      "unavailable",
    ]);
  });

  it("defaults Expected Move Cushion sorting to descending", () => {
    expect(defaultRiskRewardSortDirection("expectedMoveCushion")).toBe("desc");
  });
});
