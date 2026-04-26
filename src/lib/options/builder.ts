import { GeneratedChainProvider } from "./chain";
import type {
  OptionChainSnapshot,
  OptionLeg,
  OptionQuote,
  OptionType,
  StrategyState,
  StrategyTemplateId,
} from "./types";

const DEFAULT_SYMBOL = "AAPL";
const DEFAULT_STRATEGY: StrategyTemplateId = "long-call";
export const BUILDER_STRATEGIES: StrategyTemplateId[] = [
  "long-call",
  "long-put",
  "covered-call",
  "cash-secured-put",
  "bull-call-spread",
  "bear-put-spread",
];

type BuilderUrlParams = {
  strategy?: string;
  symbol?: string;
  expiration?: string;
  strike?: string;
  strike2?: string;
  quantity?: string;
};

export function getBuilderOptionLegs(state: StrategyState): OptionLeg[] {
  return state.legs.filter((leg) => leg.kind === "option");
}

function findNearestQuote(
  chain: OptionChainSnapshot,
  optionType: OptionType,
  expirationValue?: string,
  strikeValue?: number,
): OptionQuote {
  const expiration =
    chain.expirations.find(
      (candidate) => candidate.expiration === expirationValue,
    ) ??
    chain.expirations[3] ??
    chain.expirations[0];

  if (!expiration) {
    throw new Error("Generated chain did not include expirations.");
  }

  const quotes = optionType === "put" ? expiration.puts : expiration.calls;
  const targetStrike = strikeValue ?? chain.underlying.price;
  const quote = quotes.reduce<OptionQuote | null>((nearest, candidate) => {
    if (!nearest) {
      return candidate;
    }

    return Math.abs(candidate.strike - targetStrike) <
      Math.abs(nearest.strike - targetStrike)
      ? candidate
      : nearest;
  }, null);

  if (!quote) {
    throw new Error("Generated chain did not include option quotes.");
  }

  return quote;
}

function findSpreadQuote(
  chain: OptionChainSnapshot,
  optionType: OptionType,
  expirationValue: string | undefined,
  longStrike: number,
  direction: "above" | "below",
  strikeValue?: number,
) {
  if (strikeValue) {
    return findNearestQuote(chain, optionType, expirationValue, strikeValue);
  }

  const expiration =
    chain.expirations.find(
      (candidate) => candidate.expiration === expirationValue,
    ) ??
    chain.expirations[3] ??
    chain.expirations[0];
  const quotes = optionType === "put" ? expiration?.puts : expiration?.calls;

  if (!quotes?.length) {
    throw new Error("Generated chain did not include option quotes.");
  }

  const candidates = quotes.filter((quote) =>
    direction === "above"
      ? quote.strike > longStrike
      : quote.strike < longStrike,
  );

  return (
    candidates.reduce<OptionQuote | null>((nearest, candidate) => {
      if (!nearest) {
        return candidate;
      }

      return Math.abs(candidate.strike - longStrike) <
        Math.abs(nearest.strike - longStrike)
        ? candidate
        : nearest;
    }, null) ?? findNearestQuote(chain, optionType, expirationValue, longStrike)
  );
}

function optionLegFromQuote(
  quote: OptionQuote,
  side: "long" | "short",
  quantity: number,
): OptionLeg {
  return {
    kind: "option",
    optionType: quote.optionType,
    side,
    quantity,
    expiration: quote.expiration,
    strike: quote.strike,
    premium: quote.mid,
    impliedVolatility: quote.impliedVolatility,
  };
}

export function createBuilderState(input?: {
  symbol?: string;
  strategy?: StrategyTemplateId;
  expiration?: string;
  strike?: number;
  strike2?: number;
  quantity?: number;
}): StrategyState {
  const symbol = (input?.symbol ?? DEFAULT_SYMBOL).trim().toUpperCase();
  const strategy = coerceBuilderStrategy(input?.strategy);
  const chain = new GeneratedChainProvider().getChain(symbol);
  const quantity = input?.quantity ?? 1;
  const optionType =
    strategy === "long-put" ||
    strategy === "cash-secured-put" ||
    strategy === "bear-put-spread"
      ? "put"
      : "call";
  const longQuote = findNearestQuote(
    chain,
    optionType,
    input?.expiration,
    input?.strike,
  );
  const shortQuote =
    strategy === "bull-call-spread"
      ? findSpreadQuote(
          chain,
          "call",
          longQuote.expiration,
          longQuote.strike,
          "above",
          input?.strike2,
        )
      : strategy === "bear-put-spread"
        ? findSpreadQuote(
            chain,
            "put",
            longQuote.expiration,
            longQuote.strike,
            "below",
            input?.strike2,
          )
        : null;

  const legs: StrategyState["legs"] = [];

  if (strategy === "covered-call") {
    legs.push({
      kind: "stock",
      side: "long",
      quantity: quantity * 100,
      entryPrice: chain.underlying.price,
    });
    legs.push(optionLegFromQuote(longQuote, "short", quantity));
  } else if (strategy === "cash-secured-put") {
    legs.push(optionLegFromQuote(longQuote, "short", quantity));
  } else if (strategy === "bull-call-spread" && shortQuote) {
    legs.push(optionLegFromQuote(longQuote, "long", quantity));
    legs.push(optionLegFromQuote(shortQuote, "short", quantity));
  } else if (strategy === "bear-put-spread" && shortQuote) {
    legs.push(optionLegFromQuote(longQuote, "long", quantity));
    legs.push(optionLegFromQuote(shortQuote, "short", quantity));
  } else {
    legs.push(optionLegFromQuote(longQuote, "long", quantity));
  }

  return {
    version: 1,
    strategy,
    symbol: chain.underlying.symbol,
    underlyingPrice: chain.underlying.price,
    asOf: chain.underlying.asOf,
    legs,
  };
}

export function getBuilderChain(state: StrategyState): OptionChainSnapshot {
  return new GeneratedChainProvider().getChain(
    state.symbol,
    new Date(state.asOf),
  );
}

function coerceBuilderStrategy(strategy?: string): StrategyTemplateId {
  return BUILDER_STRATEGIES.includes(strategy as StrategyTemplateId)
    ? (strategy as StrategyTemplateId)
    : DEFAULT_STRATEGY;
}

function parsePositiveNumber(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseBuilderState(params: BuilderUrlParams): StrategyState {
  return createBuilderState({
    symbol: params.symbol,
    strategy: coerceBuilderStrategy(params.strategy),
    expiration: params.expiration,
    strike: parsePositiveNumber(params.strike),
    strike2: parsePositiveNumber(params.strike2),
    quantity: parsePositiveNumber(params.quantity),
  });
}

export function serializeBuilderState(state: StrategyState) {
  const optionLegs = getBuilderOptionLegs(state);
  const firstLeg = optionLegs[0];
  const secondLeg = optionLegs[1];
  const params = new URLSearchParams();

  if (firstLeg) {
    params.set("exp", firstLeg.expiration);
    params.set("strike", String(firstLeg.strike));
    params.set("qty", String(firstLeg.quantity));
  }

  if (secondLeg) {
    params.set("strike2", String(secondLeg.strike));
  }

  const query = params.toString();
  const path = `/build/${encodeURIComponent(state.strategy)}/${encodeURIComponent(
    state.symbol,
  )}`;

  return query ? `${path}?${query}` : path;
}
