import type {
  OptionLeg,
  PositionLeg,
  StrategyState,
  StrategyTemplateId,
} from "./types";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

function describeOptionLeg(leg: PositionLeg): leg is OptionLeg {
  return leg.kind === "option";
}

function positiveNumber(value: number) {
  return Number.isFinite(value) && value > 0;
}

export function validateStrategyState(state: StrategyState): ValidationResult {
  const errors: string[] = [];

  if (state.version !== 1) {
    errors.push("Unsupported strategy state version.");
  }
  if (!state.symbol.trim()) {
    errors.push("Symbol is required.");
  }
  if (!positiveNumber(state.underlyingPrice)) {
    errors.push("Underlying price must be positive.");
  }
  if (state.legs.length === 0) {
    errors.push("At least one leg is required.");
  }

  for (const [index, leg] of state.legs.entries()) {
    if (!positiveNumber(leg.quantity)) {
      errors.push(`Leg ${index + 1} quantity must be positive.`);
    }

    if (leg.kind === "stock" && !positiveNumber(leg.entryPrice)) {
      errors.push(`Stock leg ${index + 1} entry price must be positive.`);
    }

    if (leg.kind === "option") {
      if (!positiveNumber(leg.strike)) {
        errors.push(`Option leg ${index + 1} strike must be positive.`);
      }
      if (!positiveNumber(leg.premium)) {
        errors.push(`Option leg ${index + 1} premium must be positive.`);
      }
      if (!positiveNumber(leg.impliedVolatility)) {
        errors.push(
          `Option leg ${index + 1} implied volatility must be positive.`,
        );
      }
      if (!leg.expiration) {
        errors.push(`Option leg ${index + 1} expiration is required.`);
      }
    }
  }

  errors.push(...validateTemplateShape(state));

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateTemplateShape(state: StrategyState) {
  const optionLegs = state.legs.filter(describeOptionLeg);
  const stockLegs = state.legs.filter((leg) => leg.kind === "stock");
  const errors: string[] = [];

  if (
    state.strategy === "long-call" ||
    state.strategy === "long-put" ||
    state.strategy === "short-call" ||
    state.strategy === "short-put"
  ) {
    const side =
      state.strategy === "short-call" || state.strategy === "short-put"
        ? "short"
        : "long";

    if (
      state.legs.length !== 1 ||
      optionLegs.length !== 1 ||
      optionLegs[0]?.side !== side ||
      optionLegs[0]?.optionType !== optionTypeForSingleLeg(state.strategy)
    ) {
      errors.push(
        `${state.strategy} requires one ${side} matching option leg.`,
      );
    }
  }

  if (state.strategy === "covered-call") {
    if (
      state.legs.length !== 2 ||
      stockLegs.length !== 1 ||
      stockLegs[0]?.side !== "long" ||
      optionLegs.length !== 1 ||
      optionLegs[0]?.side !== "short" ||
      optionLegs[0]?.optionType !== "call"
    ) {
      errors.push("covered-call requires long stock and one short call.");
    }
  }

  if (state.strategy === "cash-secured-put") {
    if (
      state.legs.length !== 1 ||
      optionLegs.length !== 1 ||
      optionLegs[0]?.side !== "short" ||
      optionLegs[0]?.optionType !== "put"
    ) {
      errors.push("cash-secured-put requires one short put.");
    }
  }

  if (state.strategy === "bull-call-spread") {
    validateVerticalSpread(state.strategy, optionLegs, "call", "debit", errors);
  }

  if (state.strategy === "bear-put-spread") {
    validateVerticalSpread(state.strategy, optionLegs, "put", "debit", errors);
  }

  if (state.strategy === "bull-put-spread") {
    validateVerticalSpread(state.strategy, optionLegs, "put", "credit", errors);
  }

  if (state.strategy === "bear-call-spread") {
    validateVerticalSpread(
      state.strategy,
      optionLegs,
      "call",
      "credit",
      errors,
    );
  }

  if (state.strategy === "short-straddle") {
    const call = optionLegs.find((leg) => leg.optionType === "call");
    const put = optionLegs.find((leg) => leg.optionType === "put");

    if (
      optionLegs.length !== 2 ||
      !call ||
      !put ||
      call.side !== "short" ||
      put.side !== "short" ||
      call.expiration !== put.expiration ||
      call.strike !== put.strike
    ) {
      errors.push(
        "short-straddle requires one short call and one short put at the same strike and expiration.",
      );
    }
  }

  if (state.strategy === "short-strangle") {
    const call = optionLegs.find((leg) => leg.optionType === "call");
    const put = optionLegs.find((leg) => leg.optionType === "put");

    if (
      optionLegs.length !== 2 ||
      !call ||
      !put ||
      call.side !== "short" ||
      put.side !== "short" ||
      call.expiration !== put.expiration ||
      put.strike >= call.strike
    ) {
      errors.push(
        "short-strangle requires one lower-strike short put and one higher-strike short call with the same expiration.",
      );
    }
  }

  if (state.strategy === "iron-condor") {
    const longPut = optionLegs.find(
      (leg) => leg.optionType === "put" && leg.side === "long",
    );
    const shortPut = optionLegs.find(
      (leg) => leg.optionType === "put" && leg.side === "short",
    );
    const shortCall = optionLegs.find(
      (leg) => leg.optionType === "call" && leg.side === "short",
    );
    const longCall = optionLegs.find(
      (leg) => leg.optionType === "call" && leg.side === "long",
    );
    const expirations = new Set(optionLegs.map((leg) => leg.expiration));

    if (
      optionLegs.length !== 4 ||
      !longPut ||
      !shortPut ||
      !shortCall ||
      !longCall ||
      expirations.size !== 1 ||
      !(longPut.strike < shortPut.strike) ||
      !(shortPut.strike < shortCall.strike) ||
      !(shortCall.strike < longCall.strike)
    ) {
      errors.push(
        "iron-condor requires long put, short put, short call, and long call strikes in ascending order with the same expiration.",
      );
    }
  }

  return errors;
}

function optionTypeForSingleLeg(strategy: StrategyTemplateId) {
  return strategy === "long-call" || strategy === "short-call" ? "call" : "put";
}

function validateVerticalSpread(
  strategy: StrategyTemplateId,
  optionLegs: OptionLeg[],
  optionType: "call" | "put",
  spreadType: "debit" | "credit",
  errors: string[],
) {
  const longLeg = optionLegs.find((leg) => leg.side === "long");
  const shortLeg = optionLegs.find((leg) => leg.side === "short");

  if (
    optionLegs.length !== 2 ||
    !longLeg ||
    !shortLeg ||
    optionLegs.some((leg) => leg.optionType !== optionType) ||
    longLeg.expiration !== shortLeg.expiration
  ) {
    errors.push(
      `${strategy} requires one long and one short ${optionType} with the same expiration.`,
    );
    return;
  }

  if (strategy === "bull-call-spread" && longLeg.strike >= shortLeg.strike) {
    errors.push(
      "bull-call-spread long call strike must be below short call strike.",
    );
  }

  if (strategy === "bear-put-spread" && longLeg.strike <= shortLeg.strike) {
    errors.push(
      "bear-put-spread long put strike must be above short put strike.",
    );
  }

  if (strategy === "bull-put-spread" && shortLeg.strike <= longLeg.strike) {
    errors.push(
      "bull-put-spread short put strike must be above long put strike.",
    );
  }

  if (strategy === "bear-call-spread" && shortLeg.strike >= longLeg.strike) {
    errors.push(
      "bear-call-spread short call strike must be below long call strike.",
    );
  }

  if (spreadType === "credit" && shortLeg.premium <= longLeg.premium) {
    errors.push(`${strategy} short leg premium must exceed long leg premium.`);
  }
}
