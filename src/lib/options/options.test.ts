import { describe, expect, it } from "vitest";
import {
  evaluateStrategy,
  GeneratedChainProvider,
  type StrategyState,
  validateStrategyState,
} from "./index";

const representativeLongCall: StrategyState = {
  version: 1,
  strategy: "long-call",
  symbol: "aapl",
  underlyingPrice: 172,
  asOf: "2026-04-24T16:00:00.000Z",
  legs: [
    {
      kind: "option",
      optionType: "call",
      side: "long",
      quantity: 1,
      expiration: "2026-05-24",
      strike: 170,
      premium: 6.5,
      impliedVolatility: 0.28,
    },
  ],
};

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

describe("strategy validation", () => {
  it("accepts a normalized long call and rejects malformed template shapes", () => {
    expect(validateStrategyState(representativeLongCall).valid).toBe(true);

    const invalidCoveredCall: StrategyState = {
      ...representativeLongCall,
      strategy: "covered-call",
    };

    expect(validateStrategyState(invalidCoveredCall)).toMatchObject({
      valid: false,
    });
  });

  it("validates vertical spread strike ordering", () => {
    const spread: StrategyState = {
      version: 1,
      strategy: "bull-call-spread",
      symbol: "SPY",
      underlyingPrice: 512,
      asOf: "2026-04-24T16:00:00.000Z",
      legs: [
        {
          kind: "option",
          optionType: "call",
          side: "long",
          quantity: 1,
          expiration: "2026-05-24",
          strike: 520,
          premium: 8,
          impliedVolatility: 0.22,
        },
        {
          kind: "option",
          optionType: "call",
          side: "short",
          quantity: 1,
          expiration: "2026-05-24",
          strike: 510,
          premium: 4,
          impliedVolatility: 0.22,
        },
      ],
    };

    expect(validateStrategyState(spread).errors).toContain(
      "bull-call-spread long call strike must be below short call strike.",
    );
  });
});

describe("strategy evaluation", () => {
  it("computes deterministic long-call economics and payoff", () => {
    const evaluation = evaluateStrategy(representativeLongCall);

    expect(evaluation.netPremium).toBe(-650);
    expect(evaluation.capitalRequired).toBe(650);
    expect(evaluation.maxLoss).toBe(-650);
    expect(evaluation.maxProfit).toBeNull();
    expect(evaluation.breakevens[0]).toBeCloseTo(176.5, 1);
    expect(evaluation.greeks.delta).toBeGreaterThan(50);
    expect(evaluation.payoff[20]).toEqual({
      underlyingPrice: 172,
      profitLoss: -450,
    });
  });
});
