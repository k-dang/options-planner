import { blackScholes } from "../pricing";
import type {
  OptionChainProvider,
  OptionChainRequest,
  OptionChainSnapshot,
  OptionExpiration,
  OptionQuote,
  OptionType,
} from "../types";

const DEFAULT_AS_OF = new Date("2026-04-24T16:00:00.000Z");
const SYMBOL_BASE_PRICES: Record<string, number> = {
  AAPL: 172,
  AMZN: 186,
  GOOGL: 164,
  META: 508,
  MSFT: 421,
  NVDA: 880,
  SPY: 512,
  TSLA: 178,
};
const SYMBOL_BASE_IV: Record<string, number> = {
  AAPL: 0.24,
  AMZN: 0.29,
  GOOGL: 0.27,
  META: 0.32,
  MSFT: 0.23,
  NVDA: 0.46,
  SPY: 0.18,
  TSLA: 0.55,
};

function stableSymbolPrice(symbol: string) {
  const normalized = symbol.toUpperCase();
  if (SYMBOL_BASE_PRICES[normalized]) {
    return SYMBOL_BASE_PRICES[normalized];
  }

  const hash = normalized
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return 50 + (hash % 260);
}

function isoDateAfter(asOf: Date, days: number) {
  const date = new Date(asOf);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function roundToNickel(value: number) {
  return Math.round(value * 20) / 20;
}

function strikeStep(price: number) {
  if (price < 75) {
    return 2.5;
  }
  if (price < 250) {
    return 5;
  }
  return 10;
}

function buildStrikeLadder(price: number) {
  const step = strikeStep(price);
  const anchor = Math.round(price / step) * step;

  return Array.from({ length: 25 }, (_, index) =>
    Number((anchor + (index - 12) * step).toFixed(2)),
  ).filter((strike) => strike > 0);
}

function buildQuote(
  optionType: OptionType,
  expiration: string,
  daysToExpiration: number,
  strike: number,
  underlyingPrice: number,
  baseVolatility: number,
): OptionQuote {
  const moneyness = Math.abs(Math.log(strike / underlyingPrice));
  const termBump = Math.sqrt(daysToExpiration / 365) * 0.04;
  const skewBump =
    optionType === "put"
      ? Math.max(underlyingPrice / strike - 1, 0) * 0.18
      : Math.max(strike / underlyingPrice - 1, 0) * 0.08;
  const impliedVolatility = Number(
    Math.min(
      0.95,
      baseVolatility + moneyness * 0.48 + termBump + skewBump,
    ).toFixed(4),
  );
  const priced = blackScholes({
    optionType,
    spot: underlyingPrice,
    strike,
    yearsToExpiration: daysToExpiration / 365,
    volatility: impliedVolatility,
  });
  const spread = Math.max(0.05, priced.price * 0.035);
  const bid = Math.max(0.01, roundToNickel(priced.price - spread / 2));
  const ask = Math.max(bid + 0.05, roundToNickel(priced.price + spread / 2));

  return {
    provider: "generated",
    optionType,
    expiration,
    strike,
    bid,
    ask,
    mid: roundToNickel((bid + ask) / 2),
    last: roundToNickel(priced.price),
    volume: null,
    openInterest: null,
    impliedVolatility,
    delta: Number(priced.greeks.delta.toFixed(4)),
    gamma: Number(priced.greeks.gamma.toFixed(4)),
    theta: Number(priced.greeks.theta.toFixed(4)),
    vega: Number(priced.greeks.vega.toFixed(4)),
    rho: Number(priced.greeks.rho.toFixed(4)),
    updatedAt: null,
  };
}

export function createGeneratedChain(
  symbol: string,
  asOf = DEFAULT_AS_OF,
): OptionChainSnapshot {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const price = stableSymbolPrice(normalizedSymbol);
  const baseVolatility = SYMBOL_BASE_IV[normalizedSymbol] ?? 0.3;
  const expirationDays = [7, 14, 21, 30, 45, 60, 90, 120];
  const strikes = buildStrikeLadder(price);
  const expirations: OptionExpiration[] = expirationDays.map(
    (daysToExpiration) => {
      const expiration = isoDateAfter(asOf, daysToExpiration);

      return {
        expiration,
        daysToExpiration,
        calls: strikes.map((strike) =>
          buildQuote(
            "call",
            expiration,
            daysToExpiration,
            strike,
            price,
            baseVolatility,
          ),
        ),
        puts: strikes.map((strike) =>
          buildQuote(
            "put",
            expiration,
            daysToExpiration,
            strike,
            price,
            baseVolatility,
          ),
        ),
      };
    },
  );

  return {
    underlying: {
      symbol: normalizedSymbol,
      price,
      asOf: asOf.toISOString(),
    },
    expirations,
  };
}

export class GeneratedChainProvider implements OptionChainProvider {
  async getChain(input: OptionChainRequest): Promise<OptionChainSnapshot> {
    return createGeneratedChain(input.symbol, input.asOf);
  }
}
