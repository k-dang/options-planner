import type { StrategyTemplate } from "@/modules/strategies/catalog";
import {
  getV1StrategyTemplateById,
  getV1StrategyTemplateByName,
} from "@/modules/strategies/catalog";
import type { BuilderStateInput } from "@/modules/strategies/schemas";
import { builderStateSchema } from "@/modules/strategies/schemas";

const DEFAULT_BUILDER_STATE = {
  horizonDays: 30,
  riskFreeRate: 0.04,
  commissions: {
    perContract: 0.65,
    perLegFee: 0.1,
  },
  ivOverrides: {
    byExpiry: {},
  },
  grid: {
    pricePoints: 7,
    datePoints: 3,
    priceRangePct: 0.25,
  },
} satisfies Omit<BuilderStateInput, "symbol" | "templateName" | "legs">;

type RouteParamValue = string | string[] | undefined;

type BuilderRouteParams = {
  strategyId?: RouteParamValue;
  symbol?: RouteParamValue;
  legs?: RouteParamValue;
};

export type BuilderRouteParseResult =
  | {
      status: "ready";
      builderState: BuilderStateInput;
    }
  | {
      status: "unavailable";
      message: string;
    };

type BuilderOptionLeg = BuilderStateInput["legs"][number] & {
  kind: "option";
  right?: "C" | "P";
  strike?: number;
  expiry?: string;
};

export function serializeBuilderStateForUrl(args: {
  strategyName: string;
  builderState: BuilderStateInput;
}) {
  try {
    const normalizedSymbol = normalizeRequiredRouteValue(
      args.builderState.symbol,
    );
    const template = getV1StrategyTemplateByName(args.strategyName);
    if (!template) {
      throw new Error(`Unsupported strategy: ${args.strategyName}`);
    }

    if (!legsMatchTemplate(args.builderState.legs, template.legsSpec)) {
      return null;
    }

    const optionLegTokens = args.builderState.legs
      .filter((leg): leg is BuilderOptionLeg => leg.kind === "option")
      .map((leg) => {
        if (!leg.right || leg.strike == null || !leg.expiry) {
          throw new Error("Option legs require right, strike, and expiry.");
        }

        return serializeOptionLegToken({
          symbol: normalizedSymbol,
          side: leg.side,
          right: leg.right,
          strike: leg.strike,
          expiry: leg.expiry,
        });
      })
      .join(",");

    return `/builder/${template.id}/${encodeURIComponent(normalizedSymbol)}/${optionLegTokens}`;
  } catch {
    return null;
  }
}

export function parseBuilderStateFromRouteParams(params: BuilderRouteParams) {
  const strategyId = getRouteParam(params.strategyId);
  const symbol = normalizeRouteValue(getRouteParam(params.symbol));
  const legs = normalizeRouteValue(getRouteParam(params.legs));

  if (!strategyId || !symbol || !legs) {
    return {
      status: "unavailable",
      message: "Open the builder from an optimizer result to load a strategy.",
    } satisfies BuilderRouteParseResult;
  }

  const template = getV1StrategyTemplateById(strategyId);
  if (!template) {
    return {
      status: "unavailable",
      message: "The builder route is invalid.",
    } satisfies BuilderRouteParseResult;
  }

  try {
    const parsedOptionLegs = parseOptionLegTokens({ symbol, legs });
    const builderState = {
      symbol,
      templateName: template.name,
      ...DEFAULT_BUILDER_STATE,
      legs: buildTemplateLegs({
        symbol,
        strategyId,
        parsedOptionLegs,
      }),
    } satisfies BuilderStateInput;

    const parsed = builderStateSchema.safeParse(builderState);
    if (!parsed.success) {
      return {
        status: "unavailable",
        message: "The builder route is invalid.",
      } satisfies BuilderRouteParseResult;
    }

    return {
      status: "ready",
      builderState: parsed.data,
    } satisfies BuilderRouteParseResult;
  } catch {
    return {
      status: "unavailable",
      message: "The builder route could not be parsed.",
    } satisfies BuilderRouteParseResult;
  }
}

function serializeOptionLegToken(args: {
  symbol: string;
  side: "buy" | "sell";
  right: "C" | "P";
  strike: number;
  expiry: string;
}) {
  return `${args.side === "buy" ? "+" : "-"}.${args.symbol.toUpperCase()}${toCompactExpiry(args.expiry)}${args.right}${formatStrike(args.strike)}`;
}

function buildTemplateLegs(args: {
  symbol: string;
  strategyId: string;
  parsedOptionLegs: Array<{
    side: "buy" | "sell";
    right: "C" | "P";
    strike: number;
    expiry: string;
  }>;
}): BuilderStateInput["legs"] {
  const template = getV1StrategyTemplateById(args.strategyId);
  if (!template) {
    throw new Error(`Unsupported strategy: ${args.strategyId}`);
  }

  const optionLegTemplates = template.legsSpec.filter(
    (leg) => leg.kind === "option",
  );

  if (optionLegTemplates.length !== args.parsedOptionLegs.length) {
    throw new Error("Leg count does not match strategy template.");
  }

  let optionLegIndex = 0;

  return template.legsSpec.map((legTemplate) => {
    if (legTemplate.kind === "stock") {
      return {
        kind: "stock",
        side: legTemplate.side,
        qty: legTemplate.qty,
        entryPriceMode: legTemplate.entryPriceMode,
      };
    }

    const parsedLeg = args.parsedOptionLegs[optionLegIndex];
    optionLegIndex += 1;

    if (!legMatchesTemplate(parsedLeg, legTemplate)) {
      throw new Error("Leg token does not match strategy template.");
    }

    return {
      kind: "option",
      side: parsedLeg.side,
      qty: legTemplate.qty,
      right: parsedLeg.right,
      strike: parsedLeg.strike,
      expiry: parsedLeg.expiry,
      entryPriceMode: legTemplate.entryPriceMode,
    };
  });
}

function legsMatchTemplate(
  legs: BuilderStateInput["legs"],
  legTemplates: StrategyTemplate["legsSpec"],
) {
  if (legs.length !== legTemplates.length) {
    return false;
  }

  return legs.every((leg, index) =>
    legMatchesTemplate(leg, legTemplates[index]),
  );
}

function legMatchesTemplate(
  leg:
    | BuilderStateInput["legs"][number]
    | {
        side: "buy" | "sell";
        right: "C" | "P";
      },
  legTemplate: StrategyTemplate["legsSpec"][number],
) {
  if (leg.side !== legTemplate.side) {
    return false;
  }

  if (legTemplate.kind === "stock") {
    return !("kind" in leg) || leg.kind === "stock";
  }

  return (
    (!("kind" in leg) || leg.kind === "option") &&
    leg.right === legTemplate.right
  );
}

function parseOptionLegTokens(args: { symbol: string; legs: string }) {
  return args.legs
    .split(",")
    .map((token) => parseOptionLegToken(args.symbol, token));
}

function parseOptionLegToken(
  symbol: string,
  token: string,
): {
  side: "buy" | "sell";
  right: "C" | "P";
  strike: number;
  expiry: string;
} {
  const normalizedToken = normalizeRequiredRouteValue(token);
  const match = /^([+-])\.([A-Z0-9.-]+)(\d{6})([CP])(\d+(?:\.\d+)?)$/.exec(
    normalizedToken,
  );

  if (!match) {
    throw new Error(`Invalid leg token: ${token}`);
  }

  const [, sideToken, tokenSymbol, compactExpiry, right, strikeToken] = match;
  if (tokenSymbol !== symbol.toUpperCase()) {
    throw new Error("Leg symbol does not match route symbol.");
  }

  if (right !== "C" && right !== "P") {
    throw new Error(`Invalid option right: ${right}`);
  }

  return {
    side: sideToken === "+" ? "buy" : "sell",
    right,
    strike: Number(strikeToken),
    expiry: fromCompactExpiry(compactExpiry),
  };
}

function toCompactExpiry(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid expiry: ${value}`);
  }

  const [, year, month, day] = match;
  if (!year.startsWith("20")) {
    throw new Error(`Expiry year must be within 2000-2099; received: ${value}`);
  }

  return `${year.slice(2)}${month}${day}`;
}

function fromCompactExpiry(value: string) {
  return `20${value.slice(0, 2)}-${value.slice(2, 4)}-${value.slice(4, 6)}`;
}

function formatStrike(value: number) {
  return Number.isInteger(value) ? `${value}` : `${value}`.replace(/\.0+$/, "");
}

function getRouteParam(value: RouteParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeRouteValue(value: string | undefined) {
  if (!value) {
    return value;
  }

  return normalizeRequiredRouteValue(value);
}

function normalizeRequiredRouteValue(value: string) {
  try {
    return decodeURIComponent(value).trim().toUpperCase();
  } catch {
    return value.trim().toUpperCase();
  }
}
