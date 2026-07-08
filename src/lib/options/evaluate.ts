import {
  blackScholes,
  intrinsicValue,
  normalCdf,
  scaleGreeks,
} from "./pricing";
import { profitRangeProbability } from "./profit-range";
import { strategyTemplates } from "./strategy-templates";
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
  return (
    strategyTemplates
      .get(state.strategy)
      .evaluation?.breakevens?.(state, netPremium) ?? []
  );
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

  const range = strategyTemplates.get(state.strategy).evaluation
    ?.probabilityRange;

  return range === undefined
    ? null
    : profitRangeProbability(range, breakevens, probabilityBelow);
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
  const validation = strategyTemplates.validate(state);
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
