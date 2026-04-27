import type {
  OptionChainProvider,
  OptionChainRequest,
  OptionChainSnapshot,
  OptionQuote,
} from "../types";
import {
  expirationFromContractSymbol,
  groupQuotesByExpiration,
  midFromBidAsk,
  normalizeSymbol,
  optionTypeFromContractSymbol,
  safeNumber,
  strikeFromContractSymbol,
} from "./normalize";

const ALPACA_DATA_BASE_URL = "https://data.alpaca.markets";

export type AlpacaOptionChainProviderConfig = {
  apiKey: string;
  apiSecret: string;
  feed?: "indicative" | "opra";
  baseUrl?: string;
};

type AlpacaSnapshot = {
  latestQuote?: Record<string, unknown>;
  latestTrade?: Record<string, unknown>;
  greeks?: Record<string, unknown>;
  impliedVolatility?: unknown;
};

type AlpacaChainResponse = {
  snapshots?: Record<string, AlpacaSnapshot>;
  next_page_token?: string;
};

type AlpacaStockSnapshotResponse = {
  latestQuote?: Record<string, unknown>;
  latestTrade?: Record<string, unknown>;
  minuteBar?: Record<string, unknown>;
  dailyBar?: Record<string, unknown>;
};

export class AlpacaOptionChainProvider implements OptionChainProvider {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;
  private readonly feed: "indicative" | "opra";

  constructor(config: AlpacaOptionChainProviderConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = config.baseUrl ?? ALPACA_DATA_BASE_URL;
    this.feed = config.feed ?? "indicative";
  }

  async getChain(input: OptionChainRequest): Promise<OptionChainSnapshot> {
    const symbol = normalizeSymbol(input.symbol);
    const asOf = input.asOf ?? new Date();
    const quotes: OptionQuote[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.fetchPage(symbol, input, pageToken);
      const snapshots = response.snapshots ?? {};

      for (const [providerSymbol, snapshot] of Object.entries(snapshots)) {
        const quote = normalizeAlpacaSnapshot({
          providerSymbol,
          snapshot,
        });

        if (quote) {
          quotes.push(quote);
        }
      }

      pageToken = response.next_page_token;
    } while (pageToken);

    const underlyingPrice =
      (await this.fetchUnderlyingPrice(symbol)) ??
      estimateUnderlyingPrice(quotes);
    const underlying = {
      symbol,
      price: underlyingPrice,
      asOf: asOf.toISOString(),
    };

    return {
      underlying,
      expirations: groupQuotesByExpiration({ underlying, quotes }),
    };
  }

  private async fetchPage(
    symbol: string,
    input: OptionChainRequest,
    pageToken?: string,
  ): Promise<AlpacaChainResponse> {
    const url = new URL(
      `/v1beta1/options/snapshots/${encodeURIComponent(symbol)}`,
      this.baseUrl,
    );
    url.searchParams.set("feed", input.feed ?? this.feed);
    url.searchParams.set("limit", "1000");

    if (input.expirationGte) {
      url.searchParams.set("expiration_date_gte", input.expirationGte);
    }
    if (input.expirationLte) {
      url.searchParams.set("expiration_date_lte", input.expirationLte);
    }
    if (input.strikeGte !== undefined) {
      url.searchParams.set("strike_price_gte", String(input.strikeGte));
    }
    if (input.strikeLte !== undefined) {
      url.searchParams.set("strike_price_lte", String(input.strikeLte));
    }
    if (pageToken) {
      url.searchParams.set("page_token", pageToken);
    }

    const response = await fetch(url, {
      headers: {
        "APCA-API-KEY-ID": this.apiKey,
        "APCA-API-SECRET-KEY": this.apiSecret,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Alpaca option chain request failed with ${response.status}.`,
      );
    }

    return response.json() as Promise<AlpacaChainResponse>;
  }

  private async fetchUnderlyingPrice(symbol: string) {
    const url = new URL(
      `/v2/stocks/${encodeURIComponent(symbol)}/snapshot`,
      this.baseUrl,
    );
    const response = await fetch(url, {
      headers: {
        "APCA-API-KEY-ID": this.apiKey,
        "APCA-API-SECRET-KEY": this.apiSecret,
      },
    });

    if (!response.ok) {
      return null;
    }

    const snapshot = (await response.json()) as AlpacaStockSnapshotResponse;
    const latestQuote = snapshot.latestQuote ?? {};
    const latestTrade = snapshot.latestTrade ?? {};
    const minuteBar = snapshot.minuteBar ?? {};
    const dailyBar = snapshot.dailyBar ?? {};

    return (
      firstNumber(latestTrade, ["p", "price"]) ??
      midFromBidAsk(
        firstNumber(latestQuote, ["bp", "bidPrice", "bid_price"]),
        firstNumber(latestQuote, ["ap", "askPrice", "ask_price"]),
      ) ??
      firstNumber(minuteBar, ["c", "close"]) ??
      firstNumber(dailyBar, ["c", "close"])
    );
  }
}

export function normalizeAlpacaSnapshot(input: {
  providerSymbol: string;
  snapshot: AlpacaSnapshot;
}): OptionQuote | null {
  const optionType = optionTypeFromContractSymbol(input.providerSymbol);
  const expiration = expirationFromContractSymbol(input.providerSymbol);
  const strike = strikeFromContractSymbol(input.providerSymbol);

  if (!optionType || !expiration || strike === null) {
    return null;
  }

  const latestQuote = input.snapshot.latestQuote ?? {};
  const latestTrade = input.snapshot.latestTrade ?? {};
  const greeks = input.snapshot.greeks ?? {};
  const bid = firstNumber(latestQuote, ["bp", "bidPrice", "bid_price"]);
  const ask = firstNumber(latestQuote, ["ap", "askPrice", "ask_price"]);
  const last = firstNumber(latestTrade, ["p", "price"]);
  const mid = midFromBidAsk(bid, ask) ?? last;

  return {
    provider: "alpaca",
    providerSymbol: input.providerSymbol,
    optionType,
    expiration,
    strike,
    bid,
    ask,
    mid,
    last,
    volume: firstNumber(latestTrade, ["s", "size"]),
    openInterest: null,
    impliedVolatility: safeNumber(input.snapshot.impliedVolatility),
    delta: firstGreek(greeks, "delta"),
    gamma: firstGreek(greeks, "gamma"),
    theta: firstGreek(greeks, "theta"),
    vega: firstGreek(greeks, "vega"),
    rho: firstGreek(greeks, "rho"),
    updatedAt:
      firstString(latestQuote, ["t", "timestamp"]) ??
      firstString(latestTrade, ["t", "timestamp"]),
  };
}

function firstGreek(greeks: Record<string, unknown>, key: string) {
  return firstNumber(greeks, [key, key[0] ?? key]);
}

function firstNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = safeNumber(source[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function firstString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
  }

  return null;
}

function estimateUnderlyingPrice(quotes: OptionQuote[]) {
  const candidates = quotes
    .filter(hasPremium)
    .map((quote) => quote.strike)
    .sort((left, right) => left - right);

  if (candidates.length === 0) {
    return 0;
  }

  return candidates[Math.floor(candidates.length / 2)] ?? 0;
}

function hasPremium(quote: OptionQuote) {
  return (
    quote.mid !== null ||
    quote.last !== null ||
    quote.ask !== null ||
    quote.bid !== null
  );
}
