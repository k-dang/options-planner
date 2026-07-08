import { signedDistanceToProfitRange } from "./profit-range";
import { strategyTemplates } from "./strategy-templates";
import type { OptionLeg, StrategyEvaluation, StrategyState } from "./types";

export function calculateExpectedMoveCushion(
  state: StrategyState,
  evaluation: StrategyEvaluation,
) {
  if (!Number.isFinite(state.underlyingPrice) || state.underlyingPrice <= 0) {
    return null;
  }

  const expiration = firstOptionExpiration(state);
  const averageImpliedVolatility = averageOptionLegImpliedVolatility(state);
  const range = strategyTemplates.get(state.strategy).evaluation
    ?.probabilityRange;

  if (
    expiration === null ||
    averageImpliedVolatility === null ||
    range === undefined
  ) {
    return null;
  }

  const expectedMove =
    state.underlyingPrice *
    averageImpliedVolatility *
    Math.sqrt(effectiveDaysToExpiration(state.asOf, expiration) / 365);

  if (!Number.isFinite(expectedMove) || expectedMove <= 0) {
    return null;
  }

  const distance = signedDistanceToProfitRange(
    range,
    state.underlyingPrice,
    evaluation.breakevens,
  );

  return distance === null || !Number.isFinite(distance)
    ? null
    : distance / expectedMove;
}

function optionLegs(state: StrategyState): OptionLeg[] {
  return state.legs.filter((leg): leg is OptionLeg => leg.kind === "option");
}

function firstOptionExpiration(state: StrategyState) {
  return optionLegs(state)[0]?.expiration ?? null;
}

function effectiveDaysToExpiration(asOfIso: string, expirationIso: string) {
  const start = new Date(asOfIso);
  const end = new Date(`${expirationIso}T20:00:00.000Z`);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);

  return Math.max(days, 1);
}

function averageOptionLegImpliedVolatility(state: StrategyState) {
  const legs = optionLegs(state);

  if (legs.length === 0) {
    return null;
  }

  let total = 0;

  for (const leg of legs) {
    if (!Number.isFinite(leg.impliedVolatility) || leg.impliedVolatility <= 0) {
      return null;
    }

    total += leg.impliedVolatility;
  }

  return total / legs.length;
}
