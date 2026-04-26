import { describe, expect, it } from "vitest";
import { evaluateStrategy, type StrategyState } from "./index";

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

describe("strategy evaluation", () => {
  it("computes deterministic long-call economics and payoff", () => {
    const evaluation = evaluateStrategy(representativeLongCall);

    expect(evaluation.netPremium).toBe(-650);
    expect(evaluation.capitalRequired).toBe(650);
    expect(evaluation.maxLoss).toBe(-650);
    expect(evaluation.maxProfit).toBeNull();
    expect(evaluation.breakevens[0]).toBeCloseTo(176.5, 1);
    expect(evaluation.greeks.delta).toBeGreaterThan(50);
    expect(evaluation.payoff[20]).toMatchObject({
      underlyingPrice: 172,
      expirationProfitLoss: -450,
      profitLoss: -450,
    });
    expect(evaluation.payoff[20]?.modelProfitLoss).toBeGreaterThan(-100);
    expect(evaluation.payoff[20]?.modelProfitLoss).not.toBe(
      evaluation.payoff[20]?.expirationProfitLoss,
    );
    expect(evaluation.probabilityOfProfit).toBeGreaterThan(0.3);
    expect(evaluation.probabilityOfProfit).toBeLessThan(0.6);
  });

  it("computes representative long-put Greeks and probability estimates", () => {
    const evaluation = evaluateStrategy({
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
    });

    expect(evaluation.greeks.delta).toBeLessThan(-40);
    expect(evaluation.greeks.gamma).toBeGreaterThan(2);
    expect(evaluation.greeks.vega).toBeGreaterThan(10);
    expect(evaluation.greeks.theta).toBeLessThan(0);
    expect(evaluation.probabilityOfProfit).toBeGreaterThan(0.2);
    expect(evaluation.payoff[20]?.expirationProfitLoss).toBe(-420);
  });

  it("leaves probability of profit unset for strategies without supported estimate semantics", () => {
    const evaluation = evaluateStrategy({
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
          strike: 510,
          premium: 10,
          impliedVolatility: 0.22,
        },
        {
          kind: "option",
          optionType: "call",
          side: "short",
          quantity: 1,
          expiration: "2026-05-24",
          strike: 520,
          premium: 5,
          impliedVolatility: 0.22,
        },
      ],
    });

    expect(evaluation.probabilityOfProfit).toBeNull();
  });

  it("computes representative covered-call and cash-secured put capital semantics", () => {
    const coveredCall = evaluateStrategy({
      version: 1,
      strategy: "covered-call",
      symbol: "AAPL",
      underlyingPrice: 172,
      asOf: "2026-04-24T16:00:00.000Z",
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
    });
    const cashSecuredPut = evaluateStrategy({
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
    });

    expect(coveredCall.netPremium).toBe(500);
    expect(coveredCall.capitalRequired).toBe(16_700);
    expect(coveredCall.maxProfit).toBe(800);
    expect(cashSecuredPut.netPremium).toBe(600);
    expect(cashSecuredPut.capitalRequired).toBe(16_400);
    expect(cashSecuredPut.maxProfit).toBe(600);
  });
});
