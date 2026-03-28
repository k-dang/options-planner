import { z } from "zod";
import type {
  OptionChain,
  SymbolSearchResult,
  UnderlyingQuote,
} from "@/domain/market";
import {
  mockDatasetVersionSchema,
  optionChainContractSchema,
  symbolSearchResultSchema,
  underlyingQuoteSchema,
} from "@/domain/market";
import rawDataset from "./mock-data.json";
import type { MarketDataProvider } from "./types";

const mockDatasetSchema = z.object({
  version: mockDatasetVersionSchema,
  symbols: z.array(symbolSearchResultSchema),
  quotes: z.record(z.string(), underlyingQuoteSchema),
  expirations: z.record(z.string(), z.array(z.string())),
  chains: z.record(
    z.string(),
    z.record(
      z.string(),
      z.object({
        underlyingPrice: z.number(),
        contracts: z.array(optionChainContractSchema),
      }),
    ),
  ),
});

type MockDataset = z.infer<typeof mockDatasetSchema>;

function loadDataset(): MockDataset {
  const result = mockDatasetSchema.safeParse(rawDataset);
  if (!result.success) {
    console.error("Invalid mock dataset:", result.error.issues);
    throw new Error("Invalid mock dataset: failed schema validation");
  }
  return result.data;
}

const dataset = loadDataset();

export class MockMarketDataProvider implements MarketDataProvider {
  async searchSymbols(query: string): Promise<SymbolSearchResult[]> {
    const q = query.trim().toLowerCase();
    if (q.length === 0) {
      return [...dataset.symbols].sort((a, b) =>
        a.symbol.localeCompare(b.symbol),
      );
    }
    return dataset.symbols
      .filter(
        (s) =>
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q),
      )
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  async getQuote(symbol: string): Promise<UnderlyingQuote | null> {
    const key = symbol.trim().toUpperCase();
    return dataset.quotes[key] ?? null;
  }

  async getExpirations(symbol: string): Promise<string[]> {
    const key = symbol.trim().toUpperCase();
    const list = dataset.expirations[key];
    return list ? [...list] : [];
  }

  async getChain(symbol: string, expiry: string): Promise<OptionChain | null> {
    const sym = symbol.trim().toUpperCase();
    const exp = expiry.trim();
    const bySym = dataset.chains[sym];
    if (!bySym) {
      return null;
    }
    const row = bySym[exp];
    if (!row) {
      return null;
    }
    return {
      symbol: sym,
      expiry: exp,
      underlyingPrice: row.underlyingPrice,
      contracts: row.contracts,
    };
  }
}

let singleton: MockMarketDataProvider | null = null;

export function getMockMarketDataProvider(): MockMarketDataProvider {
  singleton ??= new MockMarketDataProvider();
  return singleton;
}
