import { describe, expect, it } from "vitest";
import { calculateExpectedMoveCushion } from "./metrics";
import type { StrategyEvaluation, StrategyState } from "./types";

function optionState(
  input: { impliedVolatility?: number; legs?: StrategyState["legs"] } = {},
): StrategyState {
  return {
    version: 1,
    strategy: "long-call",
    symbol: "AAPL",
    underlyingPrice: 100,
    asOf: "2026-07-07T16:00:00.000Z",
    legs: input.legs ?? [
      {
        kind: "option",
        optionType: "call",
        side: "long",
        quantity: 1,
        expiration: "2026-07-11",
        strike: 95,
        premium: 1.1,
        impliedVolatility: input.impliedVolatility ?? 0.25,
      },
    ],
  };
}

function evaluationWithBreakevens(
  state: StrategyState,
  breakevens: number[],
): StrategyEvaluation {
  return {
    state,
    netPremium: 0,
    maxProfit: null,
    maxLoss: null,
    breakevens,
    probabilityOfProfit: null,
    legs: [],
    greeks: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 },
    payoff: [],
  };
}

describe("options metrics", () => {
  it("uses a one-day floor for zero-DTE Expected Move Cushion", () => {
    const state = optionState({
      legs: [
        {
          kind: "option",
          optionType: "call",
          side: "long",
          quantity: 1,
          expiration: "2026-07-07",
          strike: 95,
          premium: 1.1,
          impliedVolatility: 0.25,
        },
      ],
    });
    const expectedMove = 100 * 0.25 * Math.sqrt(1 / 365);
    const expectedCushion = (100 - 96.1) / expectedMove;

    expect(
      calculateExpectedMoveCushion(
        state,
        evaluationWithBreakevens(state, [96.1]),
      ),
    ).toBeCloseTo(expectedCushion, 5);
  });

  it("returns null when Expected Move Cushion cannot be computed", () => {
    const state = optionState();
    const stockOnlyState = optionState({
      legs: [
        {
          kind: "stock",
          side: "long",
          quantity: 100,
          entryPrice: 100,
        },
      ],
    });
    const zeroVolatilityState = optionState({ impliedVolatility: 0 });

    expect(
      calculateExpectedMoveCushion(state, evaluationWithBreakevens(state, [])),
    ).toBeNull();
    expect(
      calculateExpectedMoveCushion(
        stockOnlyState,
        evaluationWithBreakevens(stockOnlyState, [100]),
      ),
    ).toBeNull();
    expect(
      calculateExpectedMoveCushion(
        zeroVolatilityState,
        evaluationWithBreakevens(zeroVolatilityState, [100]),
      ),
    ).toBeNull();
  });
});
