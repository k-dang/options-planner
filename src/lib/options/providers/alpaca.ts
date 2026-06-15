import type {
  AlpacaChainResponse,
  AlpacaClient,
  AlpacaOptionSnapshot,
  AlpacaStockSnapshotResponse,
} from "@/lib/alpaca/client";
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

export type AlpacaOptionChainProviderConfig = {
  client: AlpacaClient;
  feed?: "indicative" | "opra";
};

export class AlpacaOptionChainProvider implements OptionChainProvider {
  private readonly client: AlpacaClient;
  private readonly feed: "indicative" | "opra";

  constructor(config: AlpacaOptionChainProviderConfig) {
    this.client = config.client;
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

  private fetchPage(
    symbol: string,
    input: OptionChainRequest,
    pageToken?: string,
  ): Promise<AlpacaChainResponse> {
    return this.client.getOptionSnapshots(symbol, {
      feed: input.feed ?? this.feed,
      limit: 1000,
      expirationGte: input.expirationGte,
      expirationLte: input.expirationLte,
      strikeGte: input.strikeGte,
      strikeLte: input.strikeLte,
      pageToken,
    });
  }

  private async fetchUnderlyingPrice(symbol: string) {
    return underlyingPriceFromStockSnapshot(
      await this.client.getStockSnapshot(symbol),
    );
  }
}

export function underlyingPriceFromStockSnapshot(
  snapshot: AlpacaStockSnapshotResponse | null,
): number | null {
  if (!snapshot) {
    return null;
  }

  const latestQuote = snapshot.latestQuote ?? {};
  const latestTrade = snapshot.latestTrade ?? {};
  const minuteBar = snapshot.minuteBar ?? {};
  const dailyBar = snapshot.dailyBar ?? {};

  return (
    safeNumber(latestTrade.p) ??
    midFromBidAsk(safeNumber(latestQuote.bp), safeNumber(latestQuote.ap)) ??
    safeNumber(minuteBar.c) ??
    safeNumber(dailyBar.c)
  );
}

export function normalizeAlpacaSnapshot(input: {
  providerSymbol: string;
  snapshot: AlpacaOptionSnapshot;
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
  const bid = safeNumber(latestQuote.bp);
  const ask = safeNumber(latestQuote.ap);
  const last = safeNumber(latestTrade.p);
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
    volume: safeNumber(latestTrade.s),
    openInterest: null,
    impliedVolatility: safeNumber(input.snapshot.impliedVolatility),
    delta: safeNumber(greeks.delta),
    gamma: safeNumber(greeks.gamma),
    theta: safeNumber(greeks.theta),
    vega: safeNumber(greeks.vega),
    rho: safeNumber(greeks.rho),
    updatedAt: nonEmptyString(latestQuote.t) ?? nonEmptyString(latestTrade.t),
  };
}

function nonEmptyString(value: string | undefined): string | null {
  return value !== undefined && value.trim() !== "" ? value : null;
}

function estimateUnderlyingPrice(quotes: OptionQuote[]) {
  const candidates = quotes
    .flatMap((quote) => (hasPremium(quote) ? [quote.strike] : []))
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
