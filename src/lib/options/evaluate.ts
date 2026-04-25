import { blackScholes, intrinsicValue, scaleGreeks } from "./pricing";
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

function payoffAtExpiration(state: StrategyState, underlyingPrice: number) {
  const entryCashFlow = state.legs.reduce(
    (total, leg) => total + legEntryCashFlow(leg),
    0,
  );
  const terminalValue = state.legs.reduce(
    (total, leg) => total + expirationValue(leg, underlyingPrice),
    0,
  );
  const stockEntryValue = state.legs.reduce(
    (total, leg) =>
      leg.kind === "stock"
        ? total + (leg.side === "long" ? -1 : 1) * leg.entryPrice * leg.quantity
        : total,
    0,
  );

  return terminalValue + entryCashFlow - stockEntryValue;
}

function buildPayoffGrid(state: StrategyState) {
  const low = state.underlyingPrice * 0.5;
  const high = state.underlyingPrice * 1.5;
  const step = (high - low) / 40;

  return Array.from({ length: 41 }, (_, index) => {
    const underlyingPrice = Number((low + step * index).toFixed(2));

    return {
      underlyingPrice,
      profitLoss: Number(payoffAtExpiration(state, underlyingPrice).toFixed(2)),
    };
  });
}

function findBreakevens(payoff: StrategyEvaluation["payoff"]) {
  const breakevens: number[] = [];

  for (let index = 1; index < payoff.length; index += 1) {
    const previous = payoff[index - 1];
    const current = payoff[index];

    if (!previous || !current) {
      continue;
    }

    if (current.profitLoss === 0) {
      breakevens.push(current.underlyingPrice);
      continue;
    }

    if (Math.sign(previous.profitLoss) !== Math.sign(current.profitLoss)) {
      const ratio =
        Math.abs(previous.profitLoss) /
        (Math.abs(previous.profitLoss) + Math.abs(current.profitLoss));
      breakevens.push(
        Number(
          (
            previous.underlyingPrice +
            (current.underlyingPrice - previous.underlyingPrice) * ratio
          ).toFixed(2),
        ),
      );
    }
  }

  return breakevens;
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
  if (state.strategy === "cash-secured-put") {
    const put = state.legs.find((leg) => leg.kind === "option");

    return put?.kind === "option"
      ? put.strike * CONTRACT_MULTIPLIER * put.quantity -
          Math.max(netPremium, 0)
      : 0;
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

  return {
    state,
    netPremium,
    capitalRequired: estimateCapitalRequired(state, netPremium),
    maxProfit: estimateBoundedValue(values, "max"),
    maxLoss: estimateBoundedValue(values, "min"),
    breakevens: findBreakevens(payoff),
    legs,
    greeks: legs.reduce(
      (total, leg) => addGreeks(total, leg.greeks),
      emptyGreeks(),
    ),
    payoff,
  };
}
