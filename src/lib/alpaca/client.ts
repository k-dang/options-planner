const ALPACA_DATA_BASE_URL = "https://data.alpaca.markets";
const ALPACA_TRADING_BASE_URL = "https://paper-api.alpaca.markets";

export type AlpacaClientConfig = {
  apiKey: string;
  apiSecret: string;
};

export type AlpacaAsset = {
  symbol: string;
  name: string;
  status: string;
  tradable: boolean;
};

export type AlpacaQuote = {
  ap?: number; // ask price
  as?: number; // ask size
  ax?: string; // ask exchange
  bp?: number; // bid price
  bs?: number; // bid size
  bx?: string; // bid exchange
  t?: string; // timestamp (RFC-3339)
};

export type AlpacaTrade = {
  p?: number; // price
  s?: number; // size
  t?: string; // timestamp (RFC-3339)
  x?: string; // exchange
};

export type AlpacaBar = {
  o?: number; // open
  h?: number; // high
  l?: number; // low
  c?: number; // close
  v?: number; // volume
  n?: number; // trade count
  vw?: number; // volume-weighted average price
  t?: string; // timestamp (RFC-3339)
};

export type AlpacaOptionGreeks = {
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
};

export type AlpacaOptionSnapshot = {
  latestQuote?: AlpacaQuote;
  latestTrade?: AlpacaTrade;
  greeks?: AlpacaOptionGreeks;
  impliedVolatility?: number;
  dailyBar?: AlpacaBar;
  minuteBar?: AlpacaBar;
  prevDailyBar?: AlpacaBar;
};

export type AlpacaChainResponse = {
  snapshots?: Record<string, AlpacaOptionSnapshot>;
  next_page_token?: string;
};

export type AlpacaStockSnapshotResponse = {
  latestQuote?: AlpacaQuote;
  latestTrade?: AlpacaTrade;
  minuteBar?: AlpacaBar;
  dailyBar?: AlpacaBar;
  prevDailyBar?: AlpacaBar;
};

export type GetAssetsParams = {
  status?: string;
  assetClass?: string;
};

export type GetOptionSnapshotsParams = {
  feed?: string;
  limit?: number;
  expirationGte?: string;
  expirationLte?: string;
  strikeGte?: number;
  strikeLte?: number;
  pageToken?: string;
};

export class AlpacaClient {
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(config: AlpacaClientConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
  }

  async getAssets(params: GetAssetsParams = {}): Promise<AlpacaAsset[]> {
    const url = new URL("/v2/assets", ALPACA_TRADING_BASE_URL);
    if (params.status) url.searchParams.set("status", params.status);
    if (params.assetClass) {
      url.searchParams.set("asset_class", params.assetClass);
    }
    return this.requestJson<AlpacaAsset[]>(url);
  }

  async getOptionSnapshots(
    symbol: string,
    params: GetOptionSnapshotsParams = {},
  ): Promise<AlpacaChainResponse> {
    const url = new URL(
      `/v1beta1/options/snapshots/${encodeURIComponent(symbol)}`,
      ALPACA_DATA_BASE_URL,
    );
    if (params.feed) url.searchParams.set("feed", params.feed);
    if (params.limit !== undefined) {
      url.searchParams.set("limit", String(params.limit));
    }
    if (params.expirationGte) {
      url.searchParams.set("expiration_date_gte", params.expirationGte);
    }
    if (params.expirationLte) {
      url.searchParams.set("expiration_date_lte", params.expirationLte);
    }
    if (params.strikeGte !== undefined) {
      url.searchParams.set("strike_price_gte", String(params.strikeGte));
    }
    if (params.strikeLte !== undefined) {
      url.searchParams.set("strike_price_lte", String(params.strikeLte));
    }
    if (params.pageToken) url.searchParams.set("page_token", params.pageToken);

    return this.requestJson<AlpacaChainResponse>(url);
  }

  async getStockSnapshot(
    symbol: string,
  ): Promise<AlpacaStockSnapshotResponse | null> {
    const url = new URL(
      `/v2/stocks/${encodeURIComponent(symbol)}/snapshot`,
      ALPACA_DATA_BASE_URL,
    );
    const response = await this.fetch(url);
    if (!response.ok) return null;
    return response.json() as Promise<AlpacaStockSnapshotResponse>;
  }

  private async requestJson<T>(url: URL): Promise<T> {
    const response = await this.fetch(url);
    if (!response.ok) {
      throw new Error(
        `Alpaca request to ${url.pathname} failed with ${response.status}.`,
      );
    }
    return response.json() as Promise<T>;
  }

  private fetch(url: URL) {
    return fetch(url, {
      headers: {
        "APCA-API-KEY-ID": this.apiKey,
        "APCA-API-SECRET-KEY": this.apiSecret,
      },
    });
  }
}

export function getAlpacaClient(): AlpacaClient | null {
  const apiKey = process.env.ALPACA_API_KEY;
  const apiSecret = process.env.ALPACA_API_SECRET;

  if (!apiKey || !apiSecret) {
    return null;
  }

  return new AlpacaClient({ apiKey, apiSecret });
}
