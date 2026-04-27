import { describe, expect, it } from "vitest";
import {
  type OptimizerInputs,
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
  maxCapitalRequired: 20_000,
};

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

  it("filters candidates by expiration window and capital usage", () => {
    const results = optimizeStrategies({
      ...baseInputs,
      minDaysToExpiration: 40,
      maxDaysToExpiration: 50,
      maxCapitalRequired: 700,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every((candidate) => {
        const expiration = candidate.summary.expiration;
        const days =
          (new Date(`${expiration}T20:00:00.000Z`).getTime() -
            new Date(candidate.state.asOf).getTime()) /
          (24 * 60 * 60 * 1000);

        return (
          days >= 40 && days <= 50 && candidate.summary.capitalRequired <= 700
        );
      }),
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

  it("supports max profit ranking deterministically", () => {
    const results = optimizeStrategies({
      ...baseInputs,
      rankingMode: "max-profit",
    });
    const profits = results.map(
      (candidate) => candidate.summary.maxProfit ?? Number.NEGATIVE_INFINITY,
    );
    const sortedProfits = [...profits].sort((left, right) => right - left);

    expect(profits).toEqual(sortedProfits);
    expect(
      optimizeStrategies({ ...baseInputs, rankingMode: "max-profit" }).map(
        (candidate) => candidate.id,
      ),
    ).toEqual(results.map((candidate) => candidate.id));
  });

  it("supports return on capital ranking", () => {
    const results = optimizeStrategies({
      ...baseInputs,
      rankingMode: "return-on-capital",
    });
    const returns = results.map(
      (candidate) =>
        (candidate.summary.maxProfit ?? 0) /
        Math.max(candidate.summary.capitalRequired, 1),
    );
    const sortedReturns = [...returns].sort((left, right) => right - left);

    expect(returns).toEqual(sortedReturns);
  });

  it("supports downside buffer ranking", () => {
    const results = optimizeStrategies({
      ...baseInputs,
      thesis: "income",
      rankingMode: "downside-buffer",
    });
    const buffers = results.map((candidate) => {
      const breakeven = candidate.evaluation.breakevens[0] ?? 0;

      return (
        (candidate.state.underlyingPrice - breakeven) /
        candidate.state.underlyingPrice
      );
    });
    const sortedBuffers = [...buffers].sort((left, right) => right - left);

    expect(buffers).toEqual(sortedBuffers);
  });

  it("supports target profit ranking", () => {
    const targetUnderlyingPrice = 235;
    const results = optimizeStrategies({
      ...baseInputs,
      rankingMode: "target-profit",
      targetUnderlyingPrice,
    });
    const targetProfitLosses = results.map(
      (candidate) => candidate.summary.targetProfitLoss,
    );
    const sortedTargetProfitLosses = [...targetProfitLosses].sort(
      (left, right) => right - left,
    );

    expect(targetProfitLosses).toEqual(sortedTargetProfitLosses);
    expect(
      results.every(
        (candidate) =>
          candidate.summary.targetUnderlyingPrice === targetUnderlyingPrice,
      ),
    ).toBe(true);
  });

  it("centers candidate strikes around the target underlying", () => {
    const targetUnderlyingPrice = 205;
    const results = optimizeStrategies({
      ...baseInputs,
      rankingMode: "target-profit",
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
