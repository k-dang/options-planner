import type {
  OptionChain,
  SymbolSearchResult,
  UnderlyingQuote,
} from "./schemas";

export interface MarketDataProvider {
  searchSymbols(query: string): Promise<SymbolSearchResult[]>;
  getQuote(symbol: string): Promise<UnderlyingQuote | null>;
  getExpirations(symbol: string): Promise<string[]>;
  getChain(symbol: string, expiry: string): Promise<OptionChain | null>;
}
