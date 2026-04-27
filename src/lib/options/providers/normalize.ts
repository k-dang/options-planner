import { blackScholes } from "../pricing";
import type {
  LegGreeks,
  OptionChainSnapshot,
  OptionExpiration,
  OptionQuote,
  OptionType,
} from "../types";

export function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

export function safeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function midFromBidAsk(
  bid: number | null | undefined,
  ask: number | null | undefined,
) {
  if (bid !== null && bid !== undefined && ask !== null && ask !== undefined) {
    return Number(((bid + ask) / 2).toFixed(4));
  }

  return null;
}

export function usablePremium(quote: OptionQuote) {
  return quote.mid ?? quote.last ?? quote.ask ?? quote.bid;
}

export function fallbackImpliedVolatility(input: {
  quote: OptionQuote;
  underlyingPrice: number;
  defaultVolatility?: number;
}) {
  return input.quote.impliedVolatility ?? input.defaultVolatility ?? 0.3;
}

export function daysToExpiration(asOfIso: string, expirationIso: string) {
  const asOf = new Date(asOfIso);
  const expiration = new Date(`${expirationIso}T20:00:00.000Z`);

  return Math.max(
    Math.round((expiration.getTime() - asOf.getTime()) / 86_400_000),
    0,
  );
}

export function greeksForQuote(input: {
  quote: Pick<
    OptionQuote,
    "optionType" | "strike" | "impliedVolatility" | "expiration"
  >;
  underlyingPrice: number;
  asOfIso: string;
  impliedVolatility: number;
}): LegGreeks {
  return blackScholes({
    optionType: input.quote.optionType,
    spot: input.underlyingPrice,
    strike: input.quote.strike,
    yearsToExpiration:
      daysToExpiration(input.asOfIso, input.quote.expiration) / 365,
    volatility: input.impliedVolatility,
  }).greeks;
}

export function groupQuotesByExpiration(input: {
  underlying: OptionChainSnapshot["underlying"];
  quotes: OptionQuote[];
}): OptionExpiration[] {
  const expirations = new Map<string, OptionExpiration>();

  for (const quote of input.quotes) {
    const expiration =
      expirations.get(quote.expiration) ??
      ({
        expiration: quote.expiration,
        daysToExpiration: daysToExpiration(
          input.underlying.asOf,
          quote.expiration,
        ),
        calls: [],
        puts: [],
      } satisfies OptionExpiration);

    if (quote.optionType === "call") {
      expiration.calls.push(quote);
    } else {
      expiration.puts.push(quote);
    }

    expirations.set(quote.expiration, expiration);
  }

  return [...expirations.values()]
    .map((expiration) => ({
      ...expiration,
      calls: sortQuotes(expiration.calls),
      puts: sortQuotes(expiration.puts),
    }))
    .sort((left, right) => left.expiration.localeCompare(right.expiration));
}

function sortQuotes(quotes: OptionQuote[]) {
  return [...quotes].sort((left, right) => left.strike - right.strike);
}

export function optionTypeFromContractSymbol(
  symbol: string,
): OptionType | null {
  const compact = symbol.replace(/\s+/g, "");
  const match = compact.match(/\d{6}([CP])\d{8}$/);

  if (!match?.[1]) {
    return null;
  }

  return match[1] === "C" ? "call" : "put";
}

export function expirationFromContractSymbol(symbol: string) {
  const compact = symbol.replace(/\s+/g, "");
  const match = compact.match(/(\d{2})(\d{2})(\d{2})[CP]\d{8}$/);

  if (!match) {
    return null;
  }

  return `20${match[1]}-${match[2]}-${match[3]}`;
}

export function strikeFromContractSymbol(symbol: string) {
  const compact = symbol.replace(/\s+/g, "");
  const match = compact.match(/\d{6}[CP](\d{8})$/);

  if (!match?.[1]) {
    return null;
  }

  return Number((Number(match[1]) / 1000).toFixed(3));
}
