import { describe, expect, it } from "vitest";
import {
  blackScholes,
  intrinsicValue,
  normalCdf,
  scaleGreeks,
} from "./pricing";
import { CONTRACT_MULTIPLIER, type LegGreeks } from "./types";

describe("normalCdf", () => {
  it("returns 0.5 at zero and is symmetric around it", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1) + normalCdf(-1)).toBeCloseTo(1, 5);
    expect(normalCdf(2.5) + normalCdf(-2.5)).toBeCloseTo(1, 5);
  });

  it("approaches 1 and 0 in the tails", () => {
    expect(normalCdf(6)).toBeCloseTo(1, 6);
    expect(normalCdf(-6)).toBeCloseTo(0, 6);
  });

  it("matches well-known reference values", () => {
    expect(normalCdf(1)).toBeCloseTo(0.8413, 3);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);
  });
});

describe("blackScholes", () => {
  const baseInput = {
    spot: 100,
    strike: 100,
    yearsToExpiration: 30 / 365,
    volatility: 0.3,
    riskFreeRate: 0.05,
  } as const;

  it("satisfies put-call parity: C - P = S - K * exp(-rT)", () => {
    const call = blackScholes({ ...baseInput, optionType: "call" });
    const put = blackScholes({ ...baseInput, optionType: "put" });
    const parity =
      baseInput.spot -
      baseInput.strike *
        Math.exp(-baseInput.riskFreeRate * baseInput.yearsToExpiration);

    expect(call.price - put.price).toBeCloseTo(parity, 6);
  });

  it("prices ATM call and put symmetrically when the risk-free rate is zero", () => {
    const call = blackScholes({
      ...baseInput,
      riskFreeRate: 0,
      optionType: "call",
    });
    const put = blackScholes({
      ...baseInput,
      riskFreeRate: 0,
      optionType: "put",
    });

    expect(call.price).toBeCloseTo(put.price, 6);
  });

  it("keeps call delta in [0, 1] and put delta in [-1, 0]", () => {
    const call = blackScholes({ ...baseInput, optionType: "call" });
    const put = blackScholes({ ...baseInput, optionType: "put" });

    expect(call.greeks.delta).toBeGreaterThan(0);
    expect(call.greeks.delta).toBeLessThan(1);
    expect(put.greeks.delta).toBeGreaterThan(-1);
    expect(put.greeks.delta).toBeLessThan(0);
    expect(call.greeks.delta - put.greeks.delta).toBeCloseTo(1, 6);
  });

  it("returns non-negative gamma and vega and shares them across call and put", () => {
    const call = blackScholes({ ...baseInput, optionType: "call" });
    const put = blackScholes({ ...baseInput, optionType: "put" });

    expect(call.greeks.gamma).toBeGreaterThan(0);
    expect(call.greeks.vega).toBeGreaterThan(0);
    expect(call.greeks.gamma).toBeCloseTo(put.greeks.gamma, 10);
    expect(call.greeks.vega).toBeCloseTo(put.greeks.vega, 10);
  });

  it("produces negative theta for long ATM options", () => {
    const call = blackScholes({ ...baseInput, optionType: "call" });
    const put = blackScholes({ ...baseInput, optionType: "put" });

    expect(call.greeks.theta).toBeLessThan(0);
    expect(put.greeks.theta).toBeLessThan(0);
  });

  it("prices deep ITM call near intrinsic minus discounted strike", () => {
    const deepItm = blackScholes({
      optionType: "call",
      spot: 200,
      strike: 100,
      yearsToExpiration: 30 / 365,
      volatility: 0.3,
      riskFreeRate: 0.05,
    });

    const lowerBound = 200 - 100 * Math.exp(-0.05 * (30 / 365));
    expect(deepItm.price).toBeGreaterThan(lowerBound - 1e-6);
    expect(deepItm.greeks.delta).toBeCloseTo(1, 3);
  });

  it("prices deep OTM call near zero with delta near zero", () => {
    const deepOtm = blackScholes({
      optionType: "call",
      spot: 50,
      strike: 200,
      yearsToExpiration: 30 / 365,
      volatility: 0.3,
      riskFreeRate: 0.05,
    });

    expect(deepOtm.price).toBeGreaterThanOrEqual(0);
    expect(deepOtm.price).toBeLessThan(0.05);
    expect(deepOtm.greeks.delta).toBeCloseTo(0, 3);
  });

  it("floors volatility and time so degenerate inputs do not produce NaN", () => {
    const zeroVol = blackScholes({
      optionType: "call",
      spot: 100,
      strike: 90,
      yearsToExpiration: 30 / 365,
      volatility: 0,
    });
    const zeroTime = blackScholes({
      optionType: "call",
      spot: 100,
      strike: 90,
      yearsToExpiration: 0,
      volatility: 0.3,
    });

    expect(Number.isFinite(zeroVol.price)).toBe(true);
    expect(Number.isFinite(zeroTime.price)).toBe(true);
    expect(zeroVol.price).toBeGreaterThan(0);
    expect(zeroTime.price).toBeGreaterThan(0);
  });

  it("uses a default risk-free rate when none is provided", () => {
    const withDefault = blackScholes({
      ...baseInput,
      optionType: "call",
      riskFreeRate: undefined,
    });
    const explicit = blackScholes({
      ...baseInput,
      optionType: "call",
      riskFreeRate: 0.045,
    });

    expect(withDefault.price).toBeCloseTo(explicit.price, 10);
  });

  it("matches a known Black-Scholes reference price for an ATM call", () => {
    const call = blackScholes({
      optionType: "call",
      spot: 100,
      strike: 100,
      yearsToExpiration: 1,
      volatility: 0.2,
      riskFreeRate: 0.05,
    });

    expect(call.price).toBeCloseTo(10.4506, 3);
  });
});

describe("intrinsicValue", () => {
  it("returns the positive in-the-money amount for calls and puts", () => {
    expect(intrinsicValue("call", 110, 100)).toBe(10);
    expect(intrinsicValue("put", 90, 100)).toBe(10);
  });

  it("clamps out-of-the-money intrinsic value to zero", () => {
    expect(intrinsicValue("call", 90, 100)).toBe(0);
    expect(intrinsicValue("put", 110, 100)).toBe(0);
  });

  it("returns zero at the strike for both option types", () => {
    expect(intrinsicValue("call", 100, 100)).toBe(0);
    expect(intrinsicValue("put", 100, 100)).toBe(0);
  });
});

describe("scaleGreeks", () => {
  const perShareGreeks: LegGreeks = {
    delta: 0.5,
    gamma: 0.02,
    theta: -0.04,
    vega: 0.1,
    rho: 0.05,
  };

  it("multiplies each greek by the contract multiplier and contract count", () => {
    expect(scaleGreeks(perShareGreeks, 1)).toEqual({
      delta: 0.5 * CONTRACT_MULTIPLIER,
      gamma: 0.02 * CONTRACT_MULTIPLIER,
      theta: -0.04 * CONTRACT_MULTIPLIER,
      vega: 0.1 * CONTRACT_MULTIPLIER,
      rho: 0.05 * CONTRACT_MULTIPLIER,
    });
  });

  it("scales linearly with contract count", () => {
    const single = scaleGreeks(perShareGreeks, 1);
    const triple = scaleGreeks(perShareGreeks, 3);

    expect(triple.delta).toBeCloseTo(single.delta * 3, 10);
    expect(triple.vega).toBeCloseTo(single.vega * 3, 10);
    expect(triple.theta).toBeCloseTo(single.theta * 3, 10);
  });

  it("zeroes out greeks when contract count is zero", () => {
    const scaled = scaleGreeks(perShareGreeks, 0);

    expect(scaled.delta).toBe(0);
    expect(scaled.gamma).toBe(0);
    expect(scaled.theta).toBeCloseTo(0, 10);
    expect(scaled.vega).toBe(0);
    expect(scaled.rho).toBe(0);
  });
});
