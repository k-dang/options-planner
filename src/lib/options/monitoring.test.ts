import { describe, expect, it } from "vitest";
import { evaluateStrategy, strategyTemplates } from "./index";
import {
  calculateCapitalAtRisk,
  calculateCurrentMarkSnapshot,
  calculateSignedMarkValue,
  getDaysUntilExpiration,
  selectOptionMark,
} from "./monitoring";
import type { OptionQuote, StrategyState } from "./types";

describe("saved strategy monitoring", () => {
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
    const state = strategyTemplates.build({
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
    const state = strategyTemplates.build({
      symbol: "AAPL",
      strategy: "short-call",
      strike: 175,
    });

    expect(calculateCapitalAtRisk(state, evaluateStrategy(state))).toBeNull();
  });

  it("calculates days until the earliest option expiration", () => {
    const state: StrategyState = {
      version: 1,
      symbol: "SPY",
      strategy: "short-strangle",
      underlyingPrice: 510,
      asOf: "2026-05-08T16:00:00.000Z",
      legs: [
        {
          kind: "option",
          optionType: "put",
          side: "long",
          quantity: 1,
          expiration: "2026-06-19",
          strike: 500,
          premium: 4,
          impliedVolatility: 0.2,
        },
        {
          kind: "option",
          optionType: "call",
          side: "long",
          quantity: 1,
          expiration: "2026-05-24",
          strike: 520,
          premium: 5,
          impliedVolatility: 0.2,
        },
      ],
    };

    expect(
      getDaysUntilExpiration(state, new Date("2026-05-08T16:00:00.000Z")),
    ).toBe(16);
  });

  it("prefers bid/ask mid, then last, then model for current option marks", () => {
    const leg = optionLeg({ premium: 4, impliedVolatility: 0.2 });
    const quote = optionQuote({ bid: 4, ask: 5, mid: null, last: 6 });

    expect(
      selectOptionMark({
        quote,
        leg,
        underlyingPrice: 510,
        observedAt: new Date("2026-05-08T16:00:00.000Z"),
      }),
    ).toEqual({ markPrice: 4.5, source: "mid" });
    expect(
      selectOptionMark({
        quote: optionQuote({ bid: null, ask: null, mid: null, last: 6 }),
        leg,
        underlyingPrice: 510,
        observedAt: new Date("2026-05-08T16:00:00.000Z"),
      }),
    ).toEqual({ markPrice: 6, source: "last" });

    const fallback = selectOptionMark({
      quote: null,
      leg,
      underlyingPrice: 510,
      observedAt: new Date("2026-05-08T16:00:00.000Z"),
    });

    expect(fallback.source).toBe("model");
    expect(fallback.markPrice).toBeGreaterThan(0);
  });

  it("calculates signed current marks, P/L, and return on risk", () => {
    const state: StrategyState = {
      version: 1,
      symbol: "SPY",
      strategy: "bull-call-spread",
      underlyingPrice: 510,
      asOf: "2026-05-08T16:00:00.000Z",
      legs: [
        optionLeg({ side: "long", strike: 510, premium: 5 }),
        optionLeg({ side: "short", strike: 520, premium: 2 }),
      ],
    };

    const mark = calculateCurrentMarkSnapshot({
      state,
      entrySignedMarkValue: 300,
      capitalAtRisk: 300,
      observedAt: new Date("2026-05-09T16:00:00.000Z"),
      chain: {
        underlying: {
          symbol: "SPY",
          price: 515,
          asOf: "2026-05-09T16:00:00.000Z",
        },
        expirations: [
          {
            expiration: "2026-05-24",
            daysToExpiration: 15,
            calls: [
              optionQuote({ strike: 510, bid: 7, ask: 8 }),
              optionQuote({ strike: 520, bid: 3, ask: 4 }),
            ],
            puts: [],
          },
        ],
      },
    });

    expect(mark.signedMarkValue).toBe(400);
    expect(mark.unrealizedProfitLoss).toBe(100);
    expect(mark.returnOnRisk).toBe(0.333333);
    expect(mark.legMarks.map((leg) => leg.source)).toEqual(["mid", "mid"]);
  });
});

function optionLeg(
  overrides: Partial<
    Extract<StrategyState["legs"][number], { kind: "option" }>
  >,
): Extract<StrategyState["legs"][number], { kind: "option" }> {
  return {
    kind: "option",
    optionType: "call",
    side: "long",
    quantity: 1,
    expiration: "2026-05-24",
    strike: 510,
    premium: 5,
    impliedVolatility: 0.2,
    ...overrides,
  };
}

function optionQuote(overrides: Partial<OptionQuote>): OptionQuote {
  return {
    provider: "generated",
    optionType: "call",
    expiration: "2026-05-24",
    strike: 510,
    bid: null,
    ask: null,
    mid: null,
    last: null,
    volume: null,
    openInterest: null,
    impliedVolatility: null,
    delta: null,
    gamma: null,
    theta: null,
    vega: null,
    rho: null,
    updatedAt: null,
    ...overrides,
  };
}
