import { describe, expect, it } from "vitest";
import { type StrategyState, validateStrategyState } from "./index";

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

  it("validates every supported builder strategy shape", () => {
    const states: StrategyState[] = [
      representativeLongCall,
      {
        ...representativeLongCall,
        strategy: "long-put",
        legs: [
          {
            kind: "option",
            optionType: "put",
            side: "long",
            quantity: 1,
            expiration: "2026-05-24",
            strike: 175,
            premium: 7.2,
            impliedVolatility: 0.3,
          },
        ],
      },
      {
        ...representativeLongCall,
        strategy: "covered-call",
        legs: [
          {
            kind: "stock",
            side: "long",
            quantity: 100,
            entryPrice: 172,
          },
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
      },
      {
        ...representativeLongCall,
        strategy: "cash-secured-put",
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
      },
      {
        ...representativeLongCall,
        strategy: "bull-call-spread",
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
          {
            kind: "option",
            optionType: "call",
            side: "short",
            quantity: 1,
            expiration: "2026-05-24",
            strike: 180,
            premium: 2.8,
            impliedVolatility: 0.28,
          },
        ],
      },
      {
        ...representativeLongCall,
        strategy: "bear-put-spread",
        legs: [
          {
            kind: "option",
            optionType: "put",
            side: "long",
            quantity: 1,
            expiration: "2026-05-24",
            strike: 175,
            premium: 7.2,
            impliedVolatility: 0.3,
          },
          {
            kind: "option",
            optionType: "put",
            side: "short",
            quantity: 1,
            expiration: "2026-05-24",
            strike: 165,
            premium: 3.1,
            impliedVolatility: 0.3,
          },
        ],
      },
    ];

    for (const state of states) {
      expect(validateStrategyState(state), state.strategy).toMatchObject({
        valid: true,
      });
    }
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
