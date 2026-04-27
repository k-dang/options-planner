import {
  blackScholes,
  intrinsicValue,
  normalCdf,
  scaleGreeks,
} from "./pricing";
import { validateStrategyState } from "./strategy";
import {
  CONTRACT_MULTIPLIER,
  type LegGreeks,
  type PositionLeg,
  type StrategyEvaluation,
  type StrategyState,
} from "./types";

function signedContracts(leg: PositionLeg) {
  return leg.side === "long" ? leg.quantity : -leg.quantity;
}

function yearsBetween(asOfIso: string, expirationIso: string) {
  const asOf = new Date(asOfIso);
  const expiration = new Date(`${expirationIso}T20:00:00.000Z`);
  const milliseconds = expiration.getTime() - asOf.getTime();

  return Math.max(milliseconds / (365 * 24 * 60 * 60 * 1000), 1 / 365);
}

function emptyGreeks(): LegGreeks {
  return { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
}

function addGreeks(left: LegGreeks, right: LegGreeks): LegGreeks {
  return {
    delta: left.delta + right.delta,
    gamma: left.gamma + right.gamma,
    theta: left.theta + right.theta,
    vega: left.vega + right.vega,
    rho: left.rho + right.rho,
  };
}

function legEntryCashFlow(leg: PositionLeg) {
  if (leg.kind === "stock") {
    return (leg.side === "long" ? -1 : 1) * leg.entryPrice * leg.quantity;
  }

  return (
    (leg.side === "long" ? -1 : 1) *
    leg.premium *
    CONTRACT_MULTIPLIER *
    leg.quantity
  );
}

function expirationValue(leg: PositionLeg, underlyingPrice: number) {
  if (leg.kind === "stock") {
    return (leg.side === "long" ? 1 : -1) * underlyingPrice * leg.quantity;
  }

  return (
    (leg.side === "long" ? 1 : -1) *
    intrinsicValue(leg.optionType, underlyingPrice, leg.strike) *
    CONTRACT_MULTIPLIER *
    leg.quantity
  );
}

function modelValue(
  state: StrategyState,
  leg: PositionLeg,
  underlyingPrice: number,
) {
  if (leg.kind === "stock") {
    return (leg.side === "long" ? 1 : -1) * underlyingPrice * leg.quantity;
  }

  const priced = blackScholes({
    optionType: leg.optionType,
    spot: underlyingPrice,
    strike: leg.strike,
    yearsToExpiration: yearsBetween(state.asOf, leg.expiration),
    volatility: leg.impliedVolatility,
  });

  return (
    (leg.side === "long" ? 1 : -1) *
    priced.price *
    CONTRACT_MULTIPLIER *
    leg.quantity
  );
}

function payoffAtExpiration(state: StrategyState, underlyingPrice: number) {
  const entryCashFlow = state.legs.reduce(
    (total, leg) => total + legEntryCashFlow(leg),
    0,
  );
  const terminalValue = state.legs.reduce(
    (total, leg) => total + expirationValue(leg, underlyingPrice),
    0,
  );

  return terminalValue + entryCashFlow;
}

function payoffAtModelDate(state: StrategyState, underlyingPrice: number) {
  const entryCashFlow = state.legs.reduce(
    (total, leg) => total + legEntryCashFlow(leg),
    0,
  );
  const currentValue = state.legs.reduce(
    (total, leg) => total + modelValue(state, leg, underlyingPrice),
    0,
  );

  return currentValue + entryCashFlow;
}

function buildPayoffGrid(state: StrategyState) {
  const low = state.underlyingPrice * 0.5;
  const high = state.underlyingPrice * 1.5;
  const step = (high - low) / 40;

  return Array.from({ length: 41 }, (_, index) => {
    const underlyingPrice = Number((low + step * index).toFixed(2));

    return {
      underlyingPrice,
      expirationProfitLoss: Number(
        payoffAtExpiration(state, underlyingPrice).toFixed(2),
      ),
      modelProfitLoss: Number(
        payoffAtModelDate(state, underlyingPrice).toFixed(2),
      ),
      profitLoss: Number(payoffAtExpiration(state, underlyingPrice).toFixed(2)),
    };
  });
}

function exactBreakevens(state: StrategyState, netPremium: number) {
  const optionLegs = state.legs.filter((leg) => leg.kind === "option");
  const firstOption = optionLegs[0];
  const stockLeg = state.legs.find((leg) => leg.kind === "stock");

  if (!firstOption) {
    return [];
  }

  const quantity = Math.max(firstOption.quantity, 1);
  const premiumPerShare = Math.abs(netPremium) / CONTRACT_MULTIPLIER / quantity;
  const creditPerShare =
    Math.max(netPremium, 0) / CONTRACT_MULTIPLIER / quantity;

  if (state.strategy === "long-call") {
    return [Number((firstOption.strike + premiumPerShare).toFixed(2))];
  }

  if (state.strategy === "short-call") {
    return [Number((firstOption.strike + creditPerShare).toFixed(2))];
  }

  if (state.strategy === "long-put") {
    return [Number((firstOption.strike - premiumPerShare).toFixed(2))];
  }

  if (state.strategy === "short-put" || state.strategy === "cash-secured-put") {
    return [Number((firstOption.strike - creditPerShare).toFixed(2))];
  }

  if (state.strategy === "covered-call" && stockLeg?.kind === "stock") {
    return [Number((stockLeg.entryPrice - creditPerShare).toFixed(2))];
  }

  if (state.strategy === "bull-call-spread") {
    const longCall = optionLegs.find((leg) => leg.side === "long");

    return longCall
      ? [Number((longCall.strike + premiumPerShare).toFixed(2))]
      : [];
  }

  if (state.strategy === "bear-put-spread") {
    const longPut = optionLegs.find((leg) => leg.side === "long");

    return longPut
      ? [Number((longPut.strike - premiumPerShare).toFixed(2))]
      : [];
  }

  if (state.strategy === "bull-put-spread") {
    const shortPut = optionLegs.find((leg) => leg.side === "short");

    return shortPut
      ? [Number((shortPut.strike - creditPerShare).toFixed(2))]
      : [];
  }

  if (state.strategy === "bear-call-spread") {
    const shortCall = optionLegs.find((leg) => leg.side === "short");

    return shortCall
      ? [Number((shortCall.strike + creditPerShare).toFixed(2))]
      : [];
  }

  if (state.strategy === "iron-condor") {
    const shortPut = optionLegs.find(
      (leg) => leg.optionType === "put" && leg.side === "short",
    );
    const shortCall = optionLegs.find(
      (leg) => leg.optionType === "call" && leg.side === "short",
    );

    return shortPut && shortCall
      ? [
          Number((shortPut.strike - creditPerShare).toFixed(2)),
          Number((shortCall.strike + creditPerShare).toFixed(2)),
        ]
      : [];
  }

  if (state.strategy === "short-straddle") {
    return [
      Number((firstOption.strike - creditPerShare).toFixed(2)),
      Number((firstOption.strike + creditPerShare).toFixed(2)),
    ];
  }

  if (state.strategy === "short-strangle") {
    const put = optionLegs.find((leg) => leg.optionType === "put");
    const call = optionLegs.find((leg) => leg.optionType === "call");

    return put && call
      ? [
          Number((put.strike - creditPerShare).toFixed(2)),
          Number((call.strike + creditPerShare).toFixed(2)),
        ]
      : [];
  }

  return [];
}

function estimateBoundedValue(values: number[], direction: "max" | "min") {
  const sorted = [...values].sort((left, right) => left - right);
  const edgeValue = direction === "max" ? sorted[sorted.length - 1] : sorted[0];
  const nextValue = direction === "max" ? sorted[sorted.length - 2] : sorted[1];

  if (edgeValue === undefined || nextValue === undefined) {
    return null;
  }

  return Math.abs(edgeValue - nextValue) < 0.01 ? edgeValue : null;
}

function estimateCapitalRequired(state: StrategyState, netPremium: number) {
  const optionLegs = state.legs.filter((leg) => leg.kind === "option");

  if (state.strategy === "cash-secured-put" || state.strategy === "short-put") {
    const put = state.legs.find((leg) => leg.kind === "option");

    return put?.kind === "option"
      ? put.strike * CONTRACT_MULTIPLIER * put.quantity -
          Math.max(netPremium, 0)
      : 0;
  }

  if (
    state.strategy === "bull-call-spread" ||
    state.strategy === "bear-put-spread" ||
    state.strategy === "bull-put-spread" ||
    state.strategy === "bear-call-spread" ||
    state.strategy === "iron-condor"
  ) {
    const width = spreadRiskWidth(optionLegs);

    return Math.max(
      width * CONTRACT_MULTIPLIER * (optionLegs[0]?.quantity ?? 1) -
        Math.max(netPremium, 0),
      0,
    );
  }

  if (
    state.strategy === "short-call" ||
    state.strategy === "short-straddle" ||
    state.strategy === "short-strangle"
  ) {
    return estimateNakedShortCapital(state, optionLegs, netPremium);
  }

  const stockCost = state.legs.reduce(
    (total, leg) =>
      leg.kind === "stock" && leg.side === "long"
        ? total + leg.entryPrice * leg.quantity
        : total,
    0,
  );
  const longOptionCost = state.legs.reduce(
    (total, leg) =>
      leg.kind === "option" && leg.side === "long"
        ? total + leg.premium * CONTRACT_MULTIPLIER * leg.quantity
        : total,
    0,
  );

  return Math.max(stockCost + longOptionCost - Math.max(netPremium, 0), 0);
}

function spreadRiskWidth(
  optionLegs: Extract<PositionLeg, { kind: "option" }>[],
) {
  const putStrikes = optionLegs
    .filter((leg) => leg.optionType === "put")
    .map((leg) => leg.strike);
  const callStrikes = optionLegs
    .filter((leg) => leg.optionType === "call")
    .map((leg) => leg.strike);
  const widths = [putStrikes, callStrikes]
    .filter((strikes) => strikes.length >= 2)
    .map((strikes) => Math.max(...strikes) - Math.min(...strikes));

  return Math.max(...widths, 0);
}

function estimateNakedShortCapital(
  state: StrategyState,
  optionLegs: Extract<PositionLeg, { kind: "option" }>[],
  netPremium: number,
) {
  const credit = Math.max(netPremium, 0);
  const requirements = optionLegs
    .filter((leg) => leg.side === "short")
    .map((leg) => {
      const outOfTheMoney =
        leg.optionType === "call"
          ? Math.max(leg.strike - state.underlyingPrice, 0)
          : Math.max(state.underlyingPrice - leg.strike, 0);
      const base =
        Math.max(
          state.underlyingPrice * 0.2 - outOfTheMoney,
          state.underlyingPrice * 0.1,
        ) *
        CONTRACT_MULTIPLIER *
        leg.quantity;

      return base + credit;
    });

  return Math.max(...requirements, credit, 0);
}

function estimateProbabilityOfProfit(
  state: StrategyState,
  breakevens: number[],
) {
  const firstOption = state.legs.find((leg) => leg.kind === "option");

  if (firstOption?.kind !== "option" || breakevens.length === 0) {
    return null;
  }

  const time = yearsBetween(state.asOf, firstOption.expiration);
  const volatility = Math.max(firstOption.impliedVolatility, 0.01);
  const drift = -0.5 * volatility * volatility * time;
  const denominator = volatility * Math.sqrt(time);
  const probabilityBelow = (price: number) =>
    normalCdf((Math.log(price / state.underlyingPrice) - drift) / denominator);

  if (state.strategy === "long-call") {
    return 1 - probabilityBelow(breakevens[0] ?? state.underlyingPrice);
  }

  if (state.strategy === "long-put") {
    return probabilityBelow(breakevens[0] ?? state.underlyingPrice);
  }

  if (
    state.strategy === "covered-call" ||
    state.strategy === "short-call" ||
    state.strategy === "bear-call-spread"
  ) {
    return probabilityBelow(breakevens[0] ?? state.underlyingPrice);
  }

  if (
    state.strategy === "cash-secured-put" ||
    state.strategy === "short-put" ||
    state.strategy === "bull-put-spread"
  ) {
    return 1 - probabilityBelow(breakevens[0] ?? state.underlyingPrice);
  }

  if (state.strategy === "bull-call-spread") {
    return 1 - probabilityBelow(breakevens[0] ?? state.underlyingPrice);
  }

  if (state.strategy === "bear-put-spread") {
    return probabilityBelow(breakevens[0] ?? state.underlyingPrice);
  }

  if (
    state.strategy === "iron-condor" ||
    state.strategy === "short-straddle" ||
    state.strategy === "short-strangle"
  ) {
    const [lower, upper] = breakevens;

    if (lower === undefined || upper === undefined) {
      return null;
    }

    return probabilityBelow(upper) - probabilityBelow(lower);
  }

  return null;
}

export function evaluateStrategy(state: StrategyState): StrategyEvaluation {
  const validation = validateStrategyState(state);
  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  const legs = state.legs.map((leg) => {
    if (leg.kind === "stock") {
      const contracts = leg.side === "long" ? leg.quantity : -leg.quantity;

      return {
        leg,
        marketValue: state.underlyingPrice * leg.quantity,
        entryValue: leg.entryPrice * leg.quantity,
        greeks: { ...emptyGreeks(), delta: contracts },
      };
    }

    const priced = blackScholes({
      optionType: leg.optionType,
      spot: state.underlyingPrice,
      strike: leg.strike,
      yearsToExpiration: yearsBetween(state.asOf, leg.expiration),
      volatility: leg.impliedVolatility,
    });
    const signed = signedContracts(leg);

    return {
      leg,
      marketValue: priced.price * CONTRACT_MULTIPLIER * leg.quantity,
      entryValue: leg.premium * CONTRACT_MULTIPLIER * leg.quantity,
      greeks: scaleGreeks(priced.greeks, signed),
    };
  });

  const netPremium = state.legs.reduce(
    (total, leg) =>
      leg.kind === "option"
        ? total +
          (leg.side === "short" ? 1 : -1) *
            leg.premium *
            CONTRACT_MULTIPLIER *
            leg.quantity
        : total,
    0,
  );
  const payoff = buildPayoffGrid(state);
  const values = payoff.map((point) => point.profitLoss);
  const breakevens = exactBreakevens(state, netPremium);

  return {
    state,
    netPremium,
    capitalRequired: estimateCapitalRequired(state, netPremium),
    maxProfit: estimateBoundedValue(values, "max"),
    maxLoss: estimateBoundedValue(values, "min"),
    breakevens,
    probabilityOfProfit: estimateProbabilityOfProfit(state, breakevens),
    legs,
    greeks: legs.reduce(
      (total, leg) => addGreeks(total, leg.greeks),
      emptyGreeks(),
    ),
    payoff,
  };
}
