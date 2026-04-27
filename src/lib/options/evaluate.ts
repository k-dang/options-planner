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

export class StrategyValidationError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super(errors.join(" "));
    this.name = "StrategyValidationError";
    this.errors = errors;
  }
}

export type StrategyEvaluationResult =
  | {
      valid: true;
      evaluation: StrategyEvaluation;
      errors: [];
    }
  | {
      valid: false;
      evaluation: null;
      errors: string[];
    };

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

function upsideSlope(leg: PositionLeg) {
  if (leg.kind === "stock") {
    return (leg.side === "long" ? 1 : -1) * leg.quantity;
  }

  if (leg.optionType === "put") {
    return 0;
  }

  return (leg.side === "long" ? 1 : -1) * CONTRACT_MULTIPLIER * leg.quantity;
}

function exactExpirationBound(state: StrategyState, direction: "max" | "min") {
  const rightSlope = state.legs.reduce(
    (total, leg) => total + upsideSlope(leg),
    0,
  );

  if (
    (direction === "max" && rightSlope > 0) ||
    (direction === "min" && rightSlope < 0)
  ) {
    return null;
  }

  const candidatePrices = new Set<number>([0]);

  for (const leg of state.legs) {
    if (leg.kind === "option") {
      candidatePrices.add(leg.strike);
    }
  }

  const values = [...candidatePrices].map((underlyingPrice) =>
    Number(payoffAtExpiration(state, underlyingPrice).toFixed(2)),
  );
  const bound = direction === "max" ? Math.max(...values) : Math.min(...values);

  if (!Number.isFinite(bound)) {
    return null;
  }

  return bound;
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

function evaluateValidatedStrategy(state: StrategyState): StrategyEvaluation {
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
  const breakevens = exactBreakevens(state, netPremium);

  return {
    state,
    netPremium,
    maxProfit: exactExpirationBound(state, "max"),
    maxLoss: exactExpirationBound(state, "min"),
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

export function safeEvaluateStrategy(
  state: StrategyState,
): StrategyEvaluationResult {
  const validation = validateStrategyState(state);
  if (!validation.valid) {
    return {
      valid: false,
      evaluation: null,
      errors: validation.errors,
    };
  }

  return {
    valid: true,
    evaluation: evaluateValidatedStrategy(state),
    errors: [],
  };
}

export function evaluateStrategy(state: StrategyState): StrategyEvaluation {
  const result = safeEvaluateStrategy(state);

  if (!result.valid) {
    throw new StrategyValidationError(result.errors);
  }

  return result.evaluation;
}
