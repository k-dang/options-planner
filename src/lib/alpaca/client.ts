const ALPACA_DATA_BASE_URL = "https://data.alpaca.markets";
const ALPACA_TRADING_BASE_URL = "https://paper-api.alpaca.markets";

export type AlpacaClientConfig = {
  apiKey: string;
  apiSecret: string;
};

export type AlpacaHost = "data" | "trading";

export class AlpacaClient {
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(config: AlpacaClientConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
  }

  buildUrl(host: AlpacaHost, path: string) {
    const base = host === "data" ? ALPACA_DATA_BASE_URL : ALPACA_TRADING_BASE_URL;
    return new URL(path, base);
  }

  fetch(url: URL) {
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
