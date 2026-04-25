import { blackScholes } from "./pricing";
import type {
  ChainProvider,
  OptionChainSnapshot,
  OptionExpiration,
  OptionQuote,
  OptionType,
} from "./types";

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

  return Array.from({ length: 17 }, (_, index) =>
    Number((anchor + (index - 8) * step).toFixed(2)),
  ).filter((strike) => strike > 0);
}

function buildQuote(
  optionType: OptionType,
  expiration: string,
  daysToExpiration: number,
  strike: number,
  underlyingPrice: number,
): OptionQuote {
  const moneyness = Math.abs(Math.log(strike / underlyingPrice));
  const termBump = Math.sqrt(daysToExpiration / 365) * 0.04;
  const impliedVolatility = Number(
    (0.22 + moneyness * 0.6 + termBump).toFixed(4),
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
    optionType,
    expiration,
    strike,
    bid,
    ask,
    mid: roundToNickel((bid + ask) / 2),
    impliedVolatility,
    delta: Number(priced.greeks.delta.toFixed(4)),
  };
}

export class GeneratedChainProvider implements ChainProvider {
  getChain(symbol: string, asOf = DEFAULT_AS_OF): OptionChainSnapshot {
    const normalizedSymbol = symbol.trim().toUpperCase();
    const price = stableSymbolPrice(normalizedSymbol);
    const expirationDays = [7, 14, 21, 30, 45, 60, 90, 120];
    const strikes = buildStrikeLadder(price);
    const expirations: OptionExpiration[] = expirationDays.map((days) => {
      const expiration = isoDateAfter(asOf, days);

      return {
        expiration,
        daysToExpiration: days,
        calls: strikes.map((strike) =>
          buildQuote("call", expiration, days, strike, price),
        ),
        puts: strikes.map((strike) =>
          buildQuote("put", expiration, days, strike, price),
        ),
      };
    });

    return {
      underlying: {
        symbol: normalizedSymbol,
        price,
        asOf: asOf.toISOString(),
      },
      expirations,
    };
  }
}
