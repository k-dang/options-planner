import { isPositiveNumber } from "@/lib/utils";
import type {
  StrategyTemplate,
  StrategyTemplateLegSpec,
  TemplateRole,
  ValidationResult,
} from "./strategy-templates";
import type { OptionLeg, StrategyState } from "./types";

export function validateStrategyStateForTemplate(
  template: StrategyTemplate,
  state: StrategyState,
): ValidationResult {
  const errors: string[] = [];

  if (state.version !== 1) {
    errors.push("Unsupported strategy state version.");
  }
  if (!state.symbol.trim()) {
    errors.push("Symbol is required.");
  }
  if (!isPositiveNumber(state.underlyingPrice)) {
    errors.push("Underlying price must be positive.");
  }
  if (state.legs.length === 0) {
    errors.push("At least one leg is required.");
  }

  for (const [index, leg] of state.legs.entries()) {
    if (!isPositiveNumber(leg.quantity)) {
      errors.push(`Leg ${index + 1} quantity must be positive.`);
    }

    if (leg.kind === "stock" && !isPositiveNumber(leg.entryPrice)) {
      errors.push(`Stock leg ${index + 1} entry price must be positive.`);
    }

    if (leg.kind === "option") {
      if (!isPositiveNumber(leg.strike)) {
        errors.push(`Option leg ${index + 1} strike must be positive.`);
      }
      if (!isPositiveNumber(leg.premium)) {
        errors.push(`Option leg ${index + 1} premium must be positive.`);
      }
      if (!isPositiveNumber(leg.impliedVolatility)) {
        errors.push(
          `Option leg ${index + 1} implied volatility must be positive.`,
        );
      }
      if (!leg.expiration) {
        errors.push(`Option leg ${index + 1} expiration is required.`);
      }
    }
  }

  errors.push(...validateTemplateShape(template, state));

  return { valid: errors.length === 0, errors };
}

function validateTemplateShape(
  template: StrategyTemplate,
  state: StrategyState,
) {
  const optionLegs = getOptionLegs(state);
  const stockLegs = state.legs.filter((leg) => leg.kind === "stock");
  const optionSpecs = template.legs.filter(
    (leg): leg is Extract<StrategyTemplateLegSpec, { kind: "option" }> =>
      leg.kind === "option",
  );
  const stockSpecs = template.legs.filter(
    (leg): leg is Extract<StrategyTemplateLegSpec, { kind: "stock" }> =>
      leg.kind === "stock",
  );
  const errors: string[] = [];
  const roles = mapTemplateRoles(optionSpecs, optionLegs);
  const expirations = new Set(optionLegs.map((leg) => leg.expiration));

  if (
    state.legs.length !== template.legs.length ||
    optionLegs.length !== optionSpecs.length ||
    stockLegs.length !== stockSpecs.length ||
    stockSpecs.some(
      (spec) => !stockLegs.some((leg) => leg.side === spec.side),
    ) ||
    optionSpecs.some((spec) => roles.get(spec.role) === undefined)
  ) {
    errors.push(templateShapeMessage(template));
    return errors;
  }

  if (optionLegs.length > 1 && expirations.size !== 1) {
    errors.push(
      `${template.id} requires option legs with the same expiration.`,
    );
  }

  if (template.validation?.sameStrike) {
    const strikes = template.validation.sameStrike.map(
      (role) => roles.get(role)?.strike,
    );

    if (
      strikes.some((strike) => strike === undefined) ||
      new Set(strikes).size !== 1
    ) {
      errors.push(
        template.validation.sameStrikeMessage ?? templateShapeMessage(template),
      );
    }
  }

  if (template.validation?.strikeOrder) {
    const orderedLegs = template.validation.strikeOrder.map((role) =>
      roles.get(role),
    );

    if (
      orderedLegs.some((leg) => leg === undefined) ||
      !orderedLegs.every((leg, index) => {
        const next = orderedLegs[index + 1];

        return !next || (leg?.strike ?? 0) < next.strike;
      })
    ) {
      errors.push(
        template.validation.strikeOrderMessage ??
          `${template.id} option strikes are out of order.`,
      );
    }
  }

  if (template.validation?.requireCredit) {
    const longLeg = optionLegs.find((leg) => leg.side === "long");
    const shortLeg = optionLegs.find((leg) => leg.side === "short");

    if (!longLeg || !shortLeg || shortLeg.premium <= longLeg.premium) {
      errors.push(
        template.validation.requireCreditMessage ??
          `${template.id} short leg premium must exceed long leg premium.`,
      );
    }
  }

  return errors;
}

function getOptionLegs(state: StrategyState): OptionLeg[] {
  return state.legs.filter((leg): leg is OptionLeg => leg.kind === "option");
}

function mapTemplateRoles(
  specs: Extract<StrategyTemplateLegSpec, { kind: "option" }>[],
  optionLegs: OptionLeg[],
) {
  const remaining = [...optionLegs];
  const roles = new Map<TemplateRole, OptionLeg>();

  for (const spec of specs) {
    const index = remaining.findIndex(
      (leg) => leg.optionType === spec.optionType && leg.side === spec.side,
    );
    const [leg] = index >= 0 ? remaining.splice(index, 1) : [];

    if (leg) {
      roles.set(spec.role, leg);
    }
  }

  return roles;
}

function templateShapeMessage(template: StrategyTemplate) {
  const parts = template.legs.map((leg) => {
    if (leg.kind === "stock") {
      return `${leg.side} stock`;
    }

    return `${leg.side} ${leg.optionType}`;
  });

  return `${template.id} requires ${joinList(parts)}.`;
}

function joinList(parts: string[]) {
  const [first, second, ...rest] = parts;

  if (!first) {
    return "no legs";
  }
  if (!second) {
    return `one ${first} leg`;
  }

  return [first, second, ...rest].join(", ");
}
