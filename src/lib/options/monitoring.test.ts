import { describe, expect, it } from "vitest";
import { createBuilderState, evaluateStrategy } from "./index";
import {
  calculateCapitalAtRisk,
  calculateSignedMarkValue,
  generateSavedStrategyName,
} from "./monitoring";
import type { StrategyState } from "./types";

describe("saved strategy monitoring", () => {
  it("generates readable names from symbol, expiration, strikes, and strategy", () => {
    const vertical = createBuilderState({
      symbol: "SPY",
      strategy: "bull-call-spread",
      expiration: "2026-05-24",
      strike: 510,
      strike2: 520,
    });
    const condor = createBuilderState({
      symbol: "AAPL",
      strategy: "iron-condor",
      strike: 160,
      strike2: 165,
      strike3: 180,
      strike4: 185,
    });

    expect(generateSavedStrategyName(vertical)).toBe(
      "SPY 2026-05-24 510/520 Bull Call Spread",
    );
    expect(generateSavedStrategyName(condor)).toBe(
      "AAPL 2026-05-24 160/165/180/185 Iron Condor",
    );
  });

  it("signs entry marks positive for long legs and negative for short legs", () => {
    const state: StrategyState = {
      version: 1,
      strategy: "covered-call",
      symbol: "AAPL",
      underlyingPrice: 172,
      asOf: "2026-04-24T16:00:00.000Z",
      legs: [
        { kind: "stock", side: "long", quantity: 100, entryPrice: 172 },
        {
          kind: "option",
          optionType: "call",
          side: "short",
          quantity: 1,
          expiration: "2026-05-24",
          strike: 175,
          premium: 5,
          impliedVolatility: 0.28,
        },
      ],
    };

    expect(calculateSignedMarkValue(state)).toBe(16_700);
  });

  it("uses finite max loss as capital at risk", () => {
    const state = createBuilderState({
      symbol: "SPY",
      strategy: "bull-call-spread",
      strike: 510,
      strike2: 520,
    });

    expect(calculateCapitalAtRisk(state, evaluateStrategy(state))).toBe(435);
  });

  it("uses collateral minus premium for cash-secured puts", () => {
    const state: StrategyState = {
      version: 1,
      strategy: "cash-secured-put",
      symbol: "AAPL",
      underlyingPrice: 172,
      asOf: "2026-04-24T16:00:00.000Z",
      legs: [
        {
          kind: "option",
          optionType: "put",
          side: "short",
          quantity: 1,
          expiration: "2026-05-24",
          strike: 170,
          premium: 6,
          impliedVolatility: 0.28,
        },
      ],
    };

    expect(calculateCapitalAtRisk(state, evaluateStrategy(state))).toBe(16_400);
  });

  it("does not invent a risk basis for undefined-risk short calls", () => {
    const state = createBuilderState({
      symbol: "AAPL",
      strategy: "short-call",
      strike: 175,
    });

    expect(calculateCapitalAtRisk(state, evaluateStrategy(state))).toBeNull();
  });
});
