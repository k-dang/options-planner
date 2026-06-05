import { cacheLife } from "next/cache";
import { getAlpacaClient } from "@/lib/alpaca/client";

export type TickerSuggestion = {
  symbol: string;
  name: string;
  type: "stock";
};

const MAX_TICKER_SUGGESTIONS = 8;

export const STOCK_TICKER_SUGGESTIONS: TickerSuggestion[] = [
  { symbol: "AAPL", name: "Apple Inc.", type: "stock" },
  { symbol: "MSFT", name: "Microsoft Corporation", type: "stock" },
  { symbol: "NVDA", name: "NVIDIA Corporation", type: "stock" },
  { symbol: "AMZN", name: "Amazon.com Inc.", type: "stock" },
  { symbol: "GOOGL", name: "Alphabet Inc.", type: "stock" },
  { symbol: "META", name: "Meta Platforms Inc.", type: "stock" },
  { symbol: "TSLA", name: "Tesla Inc.", type: "stock" },
  { symbol: "AVGO", name: "Broadcom Inc.", type: "stock" },
  { symbol: "AMD", name: "Advanced Micro Devices Inc.", type: "stock" },
  { symbol: "NFLX", name: "Netflix Inc.", type: "stock" },
  { symbol: "COST", name: "Costco Wholesale Corporation", type: "stock" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", type: "stock" },
  { symbol: "BAC", name: "Bank of America Corporation", type: "stock" },
  { symbol: "GS", name: "Goldman Sachs Group Inc.", type: "stock" },
  { symbol: "XOM", name: "Exxon Mobil Corporation", type: "stock" },
  { symbol: "CVX", name: "Chevron Corporation", type: "stock" },
  { symbol: "UNH", name: "UnitedHealth Group Incorporated", type: "stock" },
  { symbol: "JNJ", name: "Johnson & Johnson", type: "stock" },
  { symbol: "LLY", name: "Eli Lilly and Company", type: "stock" },
  { symbol: "MRK", name: "Merck & Co. Inc.", type: "stock" },
  { symbol: "WMT", name: "Walmart Inc.", type: "stock" },
  { symbol: "HD", name: "Home Depot Inc.", type: "stock" },
  { symbol: "MCD", name: "McDonald's Corporation", type: "stock" },
  { symbol: "DIS", name: "Walt Disney Company", type: "stock" },
  { symbol: "NKE", name: "Nike Inc.", type: "stock" },
  { symbol: "CRM", name: "Salesforce Inc.", type: "stock" },
  { symbol: "ORCL", name: "Oracle Corporation", type: "stock" },
  {
    symbol: "IBM",
    name: "International Business Machines Corporation",
    type: "stock",
  },
  { symbol: "INTC", name: "Intel Corporation", type: "stock" },
  { symbol: "BA", name: "Boeing Company", type: "stock" },
];

async function getAlpacaAssets(): Promise<TickerSuggestion[]> {
  "use cache";
  cacheLife("days");
  console.log("getAlpacaAssets MISS", Date.now());
  const client = getAlpacaClient();
  if (!client) return [];

  const assets = await client.getAssets({
    status: "active",
    assetClass: "us_equity",
  });

  return assets.flatMap((asset) =>
    asset.tradable
      ? [{ symbol: asset.symbol, name: asset.name, type: "stock" as const }]
      : [],
  );
}

export async function searchAlpacaTickers(
  query: string,
  limit = MAX_TICKER_SUGGESTIONS,
): Promise<TickerSuggestion[]> {
  const assets = await getAlpacaAssets();
  const normalizedQuery = query.trim().toUpperCase();

  if (!normalizedQuery) {
    return assets.slice(0, limit);
  }

  const symbolMatches = assets.filter((asset) =>
    asset.symbol.startsWith(normalizedQuery),
  );
  const nameMatches = assets.filter(
    (asset) =>
      !asset.symbol.startsWith(normalizedQuery) &&
      asset.name.toUpperCase().includes(normalizedQuery),
  );

  return [...symbolMatches, ...nameMatches].slice(0, limit);
}

export function searchTickerSuggestions(
  query: string,
  limit = MAX_TICKER_SUGGESTIONS,
) {
  const normalizedQuery = query.trim().toUpperCase();

  if (!normalizedQuery) {
    return STOCK_TICKER_SUGGESTIONS.slice(0, limit);
  }

  const symbolMatches = STOCK_TICKER_SUGGESTIONS.filter((suggestion) =>
    suggestion.symbol.startsWith(normalizedQuery),
  );
  const nameMatches = STOCK_TICKER_SUGGESTIONS.filter(
    (suggestion) =>
      !suggestion.symbol.startsWith(normalizedQuery) &&
      suggestion.name.toUpperCase().includes(normalizedQuery),
  );

  return [...symbolMatches, ...nameMatches].slice(0, limit);
}
