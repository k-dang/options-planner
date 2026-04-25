import { CONTRACT_MULTIPLIER, type LegGreeks, type OptionType } from "./types";

type BlackScholesInput = {
  optionType: OptionType;
  spot: number;
  strike: number;
  yearsToExpiration: number;
  volatility: number;
  riskFreeRate?: number;
};

export type BlackScholesResult = {
  price: number;
  greeks: LegGreeks;
};

const SQRT_2PI = Math.sqrt(2 * Math.PI);

function normalPdf(value: number) {
  return Math.exp(-0.5 * value * value) / SQRT_2PI;
}

function normalCdf(value: number) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf =
    1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1 + sign * erf);
}

export function blackScholes(input: BlackScholesInput): BlackScholesResult {
  const riskFreeRate = input.riskFreeRate ?? 0.045;
  const time = Math.max(input.yearsToExpiration, 1 / 365);
  const volatility = Math.max(input.volatility, 0.01);
  const sqrtTime = Math.sqrt(time);
  const d1 =
    (Math.log(input.spot / input.strike) +
      (riskFreeRate + 0.5 * volatility * volatility) * time) /
    (volatility * sqrtTime);
  const d2 = d1 - volatility * sqrtTime;
  const discount = Math.exp(-riskFreeRate * time);

  const price =
    input.optionType === "call"
      ? input.spot * normalCdf(d1) - input.strike * discount * normalCdf(d2)
      : input.strike * discount * normalCdf(-d2) - input.spot * normalCdf(-d1);

  const delta = input.optionType === "call" ? normalCdf(d1) : normalCdf(d1) - 1;
  const gamma = normalPdf(d1) / (input.spot * volatility * sqrtTime);
  const vega = (input.spot * normalPdf(d1) * sqrtTime) / 100;
  const callTheta =
    (-(input.spot * normalPdf(d1) * volatility) / (2 * sqrtTime) -
      riskFreeRate * input.strike * discount * normalCdf(d2)) /
    365;
  const putTheta =
    (-(input.spot * normalPdf(d1) * volatility) / (2 * sqrtTime) +
      riskFreeRate * input.strike * discount * normalCdf(-d2)) /
    365;
  const callRho = (input.strike * time * discount * normalCdf(d2)) / 100;
  const putRho = (-input.strike * time * discount * normalCdf(-d2)) / 100;

  return {
    price,
    greeks: {
      delta,
      gamma,
      theta: input.optionType === "call" ? callTheta : putTheta,
      vega,
      rho: input.optionType === "call" ? callRho : putRho,
    },
  };
}

export function intrinsicValue(
  optionType: OptionType,
  underlyingPrice: number,
  strike: number,
) {
  return optionType === "call"
    ? Math.max(0, underlyingPrice - strike)
    : Math.max(0, strike - underlyingPrice);
}

export function scaleGreeks(greeks: LegGreeks, contracts: number): LegGreeks {
  return {
    delta: greeks.delta * CONTRACT_MULTIPLIER * contracts,
    gamma: greeks.gamma * CONTRACT_MULTIPLIER * contracts,
    theta: greeks.theta * CONTRACT_MULTIPLIER * contracts,
    vega: greeks.vega * CONTRACT_MULTIPLIER * contracts,
    rho: greeks.rho * CONTRACT_MULTIPLIER * contracts,
  };
}
