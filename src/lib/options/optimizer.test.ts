import { describe, expect, it } from "vitest";
import {
  type OptimizerInputs,
  optimizeStrategies,
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

  it("creates render-ready rows with builder links", () => {
    const rows = toOptimizerResultRows(optimizeStrategies(baseInputs));

    expect(rows[0]?.expiration).toMatch(/^2026-0[5-6]-\d{2}$/);
    expect(rows[0]?.strategy).toMatch(/call|put|spread/);
    expect(rows[0]?.strikes).toContain("$");
    expect(rows[0]?.builderHref).toMatch(/^\/build\//);
  });
});
