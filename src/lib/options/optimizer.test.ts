import { describe, expect, it } from "vitest";
import {
  type OptimizerInputs,
  type OptionChainSnapshot,
  type OptionQuote,
  optimizeStrategies,
  parseBuilderState,
  toOptimizerResultRows,
  validateStrategyState,
} from "./index";

const baseInputs: OptimizerInputs = {
  symbol: "AAPL",
  thesis: "bullish",
  minDaysToExpiration: 20,
  maxDaysToExpiration: 70,
};

function testQuote(
  optionType: "call" | "put",
  expiration: string,
  strike: number,
): OptionQuote {
  return {
    provider: "generated",
    optionType,
    expiration,
    strike,
    bid: 1,
    ask: 1.2,
    mid: 1.1,
    last: 1.1,
    volume: null,
    openInterest: null,
    impliedVolatility: 0.25,
    delta: null,
    gamma: null,
    theta: null,
    vega: null,
    rho: null,
    updatedAt: null,
  };
}

function testChainWithStrikes(strikes: number[]): OptionChainSnapshot {
  const expiration = "2026-05-22";

  return {
    underlying: {
      symbol: "AAPL",
      price: 265,
      asOf: "2026-04-27T16:00:00.000Z",
    },
    expirations: [
      {
        expiration,
        daysToExpiration: 25,
        calls: strikes.map((strike) => testQuote("call", expiration, strike)),
        puts: strikes.map((strike) => testQuote("put", expiration, strike)),
      },
    ],
  };
}

describe("optimizer", () => {
  it("generates valid candidates across multiple bullish strategy families", () => {
    const results = optimizeStrategies(baseInputs);
    const strategies = new Set(
      results.map((candidate) => candidate.state.strategy),
    );

    expect(results.length).toBeGreaterThan(3);
    expect(strategies.has("long-call")).toBe(true);
    expect(strategies.has("bull-call-spread")).toBe(true);
    expect(strategies.has("cash-secured-put")).toBe(true);
    expect(
      results.every(
        (candidate) => validateStrategyState(candidate.state).valid,
      ),
    ).toBe(true);
  });

  it("filters candidates by expiration window", () => {
    const results = optimizeStrategies({
      ...baseInputs,
      minDaysToExpiration: 40,
      maxDaysToExpiration: 50,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every((candidate) => {
        const expiration = candidate.summary.expiration;
        const days =
          (new Date(`${expiration}T20:00:00.000Z`).getTime() -
            new Date(candidate.state.asOf).getTime()) /
          (24 * 60 * 60 * 1000);

        return days >= 40 && days <= 50;
      }),
    ).toBe(true);
  });

  it("filters candidates to a selected expiration", () => {
    const [candidate] = optimizeStrategies(baseInputs);
    expect(candidate).toBeDefined();

    if (!candidate) {
      return;
    }

    const results = optimizeStrategies({
      ...baseInputs,
      expiration: candidate.summary.expiration,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every(
        (result) => result.summary.expiration === candidate.summary.expiration,
      ),
    ).toBe(true);
  });

  it("sorts candidates deterministically by optimizer score", () => {
    const results = optimizeStrategies(baseInputs);
    const scores = results.map((candidate) => candidate.summary.score);
    const sortedScores = [...scores].sort((left, right) => right - left);

    expect(scores).toEqual(sortedScores);
    expect(
      optimizeStrategies(baseInputs).map((candidate) => candidate.id),
    ).toEqual(results.map((candidate) => candidate.id));
  });

  it("supports return to chance slider ranking endpoints", () => {
    const returnResults = optimizeStrategies({
      ...baseInputs,
      returnChanceWeight: 0,
    });
    const chanceResults = optimizeStrategies({
      ...baseInputs,
      returnChanceWeight: 100,
    });
    const sortedReturnScores = returnResults
      .map((candidate) => candidate.summary.score)
      .sort((left, right) => right - left);
    const sortedChanceScores = chanceResults
      .map((candidate) => candidate.summary.score)
      .sort((left, right) => right - left);

    expect(returnResults.map((candidate) => candidate.summary.score)).toEqual(
      sortedReturnScores,
    );
    expect(chanceResults.map((candidate) => candidate.summary.score)).toEqual(
      sortedChanceScores,
    );
  });

  it("changes selected legs within strategy families across slider endpoints", () => {
    const maxReturn = optimizeStrategies({
      ...baseInputs,
      returnChanceWeight: 0,
    });
    const maxChance = optimizeStrategies({
      ...baseInputs,
      returnChanceWeight: 100,
    });
    const maxChanceByStrategy = new Map(
      maxChance.map((candidate) => [candidate.state.strategy, candidate]),
    );
    const changedFamilies = maxReturn.filter((candidate) => {
      const chanceCandidate = maxChanceByStrategy.get(candidate.state.strategy);

      return chanceCandidate && chanceCandidate.id !== candidate.id;
    });

    expect(changedFamilies.length).toBeGreaterThan(0);
  });

  it("uses target profit as return basis for unlimited-profit strategies", () => {
    const results = optimizeStrategies(baseInputs);
    const longCall = results.find(
      (candidate) => candidate.state.strategy === "long-call",
    );

    expect(longCall).toBeDefined();

    if (!longCall) {
      return;
    }

    expect(longCall.summary.maxProfit).toBeNull();
    expect(longCall.summary.maxLoss).not.toBeNull();
    expect(longCall.summary.returnProfitBasisLabel).toBe("target-profit");
    expect(longCall.summary.returnProfitBasis).toBe(
      Math.max(longCall.summary.targetProfitLoss, 0),
    );
    expect(longCall.summary.returnOnRisk).toBe(
      longCall.summary.returnProfitBasis /
        Math.max(Math.abs(longCall.summary.maxLoss ?? 0), 1),
    );
  });

  it("anchors bullish long calls below the target for safer legs", () => {
    const chain = testChainWithStrikes(
      Array.from({ length: 17 }, (_, index) => 230 + index * 5),
    );
    const results = optimizeStrategies(
      {
        ...baseInputs,
        targetUnderlyingPrice: 282,
        returnChanceWeight: 0,
      },
      chain,
    );
    const longCall = results.find(
      (candidate) => candidate.state.strategy === "long-call",
    );

    expect(longCall).toBeDefined();
    expect(longCall?.summary.strikes).toEqual([260]);
  });

  it("centers candidate strikes around the target underlying", () => {
    const targetUnderlyingPrice = 205;
    const results = optimizeStrategies({
      ...baseInputs,
      targetUnderlyingPrice,
    });
    const strikes = results.flatMap((candidate) => candidate.summary.strikes);

    expect(strikes.some((strike) => strike >= 200)).toBe(true);
  });

  it("creates render-ready rows with builder links", () => {
    const rows = toOptimizerResultRows(optimizeStrategies(baseInputs));

    expect(rows[0]?.expiration).toMatch(/^2026-0[5-6]-\d{2}$/);
    expect(rows[0]?.strategy).toMatch(/call|put|spread/);
    expect(rows[0]?.strikes).toContain("$");
    expect(rows[0]?.builderHref).toMatch(/^\/build\//);
  });

  it("opens optimizer candidates as matching canonical builder state", () => {
    const candidate = optimizeStrategies(baseInputs)[0];
    expect(candidate).toBeDefined();

    if (!candidate) {
      return;
    }

    const url = new URL(candidate.summary.builderHref, "https://example.test");
    const [, , strategy, symbol] = url.pathname.split("/");
    const restored = parseBuilderState({
      strategy,
      symbol,
      expiration: url.searchParams.get("exp") ?? undefined,
      strike: url.searchParams.get("strike") ?? undefined,
      strike2: url.searchParams.get("strike2") ?? undefined,
      quantity: url.searchParams.get("qty") ?? undefined,
    });

    expect(restored.strategy).toBe(candidate.state.strategy);
    expect(restored.symbol).toBe(candidate.state.symbol);
    expect(restored.legs).toEqual(candidate.state.legs);
  });
});
