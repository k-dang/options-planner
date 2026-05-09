import type { StrategySnapshotLegMark } from "@/db/schema";
import type { StrategyEvaluation, StrategyState } from "./types";
import { CONTRACT_MULTIPLIER } from "./types";

export function generateSavedStrategyName(state: StrategyState) {
  const expirations = [
    ...new Set(
      state.legs
        .filter((leg) => leg.kind === "option")
        .map((leg) => leg.expiration),
    ),
  ];
  const strikes = state.legs
    .filter((leg) => leg.kind === "option")
    .map((leg) => formatStrike(leg.strike));
  const strategyLabel = formatStrategyLabel(state.strategy);
  const expirationLabel =
    expirations.length === 1
      ? expirations[0]
      : expirations.length > 1
        ? "multi-exp"
        : "stock";
  const strikeLabel = strikes.length > 0 ? strikes.join("/") : "shares";

  return `${state.symbol.toUpperCase()} ${expirationLabel} ${strikeLabel} ${strategyLabel}`;
}

export function calculateSignedMarkValue(state: StrategyState) {
  return roundMoney(
    state.legs.reduce((total, leg) => total + signedEntryLegValue(leg), 0),
  );
}

export function buildEntryLegMarks(
  state: StrategyState,
): StrategySnapshotLegMark[] {
  return state.legs.map((leg, index) => {
    const markPrice = leg.kind === "stock" ? leg.entryPrice : leg.premium;

    return {
      legIndex: index,
      kind: leg.kind,
      side: leg.side,
      quantity: leg.quantity,
      markPrice,
      signedMarkValue: roundMoney(signedEntryLegValue(leg)),
      source: leg.kind === "stock" ? "underlying" : "entry",
      updatedAt: state.asOf,
    };
  });
}

export function calculateCapitalAtRisk(
  state: StrategyState,
  evaluation: StrategyEvaluation,
) {
  if (evaluation.maxLoss !== null && Number.isFinite(evaluation.maxLoss)) {
    return roundMoney(Math.abs(evaluation.maxLoss));
  }

  if (state.strategy === "cash-secured-put") {
    const shortPut = state.legs.find(
      (leg) =>
        leg.kind === "option" &&
        leg.optionType === "put" &&
        leg.side === "short",
    );

    if (!shortPut || shortPut.kind !== "option") {
      return null;
    }

    return roundMoney(
      shortPut.strike * CONTRACT_MULTIPLIER * shortPut.quantity -
        shortPut.premium * CONTRACT_MULTIPLIER * shortPut.quantity,
    );
  }

  if (state.strategy === "covered-call") {
    const stockLeg = state.legs.find((leg) => leg.kind === "stock");
    const shortCall = state.legs.find(
      (leg) =>
        leg.kind === "option" &&
        leg.optionType === "call" &&
        leg.side === "short",
    );

    if (!stockLeg || stockLeg.kind !== "stock") {
      return null;
    }

    const callCredit =
      shortCall && shortCall.kind === "option"
        ? shortCall.premium * CONTRACT_MULTIPLIER * shortCall.quantity
        : 0;

    return roundMoney(stockLeg.entryPrice * stockLeg.quantity - callCredit);
  }

  return null;
}

function signedEntryLegValue(leg: StrategyState["legs"][number]) {
  const direction = leg.side === "long" ? 1 : -1;

  if (leg.kind === "stock") {
    return direction * leg.entryPrice * leg.quantity;
  }

  return direction * leg.premium * CONTRACT_MULTIPLIER * leg.quantity;
}

function formatStrategyLabel(strategy: StrategyState["strategy"]) {
  return strategy
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatStrike(strike: number) {
  return Number.isInteger(strike) ? String(strike) : strike.toFixed(2);
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}
