import { GeneratedChainProvider } from "./chain";
import type {
  OptionChainSnapshot,
  OptionLeg,
  OptionQuote,
  StrategyState,
  StrategyTemplateId,
} from "./types";

const DEFAULT_SYMBOL = "AAPL";
const DEFAULT_STRATEGY: BuilderStrategyId = "long-call";

type BuilderStrategyId = Extract<StrategyTemplateId, "long-call" | "long-put">;

type BuilderUrlParams = {
  strategy?: string;
  symbol?: string;
  expiration?: string;
  strike?: string;
  quantity?: string;
};

export function getBuilderOptionLeg(state: StrategyState): OptionLeg {
  const leg = state.legs[0];

  if (leg?.kind !== "option") {
    throw new Error("Builder state requires an option leg.");
  }

  return leg;
}

function findNearestQuote(
  chain: OptionChainSnapshot,
  strategy: StrategyTemplateId,
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

  const quotes = strategy === "long-put" ? expiration.puts : expiration.calls;
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

export function createBuilderState(input?: {
  symbol?: string;
  strategy?: StrategyTemplateId;
  expiration?: string;
  strike?: number;
  quantity?: number;
}): StrategyState {
  const symbol = (input?.symbol ?? DEFAULT_SYMBOL).trim().toUpperCase();
  const strategy = coerceBuilderStrategy(input?.strategy);
  const chain = new GeneratedChainProvider().getChain(symbol);
  const quote = findNearestQuote(
    chain,
    strategy,
    input?.expiration,
    input?.strike,
  );

  return {
    version: 1,
    strategy,
    symbol: chain.underlying.symbol,
    underlyingPrice: chain.underlying.price,
    asOf: chain.underlying.asOf,
    legs: [
      {
        kind: "option",
        optionType: strategy === "long-put" ? "put" : "call",
        side: "long",
        quantity: input?.quantity ?? 1,
        expiration: quote.expiration,
        strike: quote.strike,
        premium: quote.mid,
        impliedVolatility: quote.impliedVolatility,
      },
    ],
  };
}

export function getBuilderChain(state: StrategyState): OptionChainSnapshot {
  return new GeneratedChainProvider().getChain(
    state.symbol,
    new Date(state.asOf),
  );
}

function coerceBuilderStrategy(strategy?: string): BuilderStrategyId {
  return strategy === "long-put" ? "long-put" : DEFAULT_STRATEGY;
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
    quantity: parsePositiveNumber(params.quantity),
  });
}

export function serializeBuilderState(state: StrategyState) {
  const leg = state.legs[0];
  const params = new URLSearchParams();

  if (leg?.kind === "option") {
    params.set("exp", leg.expiration);
    params.set("strike", String(leg.strike));
    params.set("qty", String(leg.quantity));
  }

  const query = params.toString();
  const path = `/build/${encodeURIComponent(state.strategy)}/${encodeURIComponent(
    state.symbol,
  )}`;

  return query ? `${path}?${query}` : path;
}
