import type { OptimizerRequest, UnderlyingQuote } from "@/domain";
import { calculateStrategyAnalytics, runOptimizer } from "@/engine";
import { getMarketDataProvider } from "@/providers";
import { ServiceError } from "./service-errors";
import { getOptionExpiries, loadChainsByExpiry } from "./strategy-service";

export async function runOptimizerForSymbol(symbol: string) {
  const provider = getMarketDataProvider();
  const [quote, expirations] = await Promise.all([
    provider.getQuote(symbol),
    provider.getExpirations(symbol),
  ]);

  if (!quote) {
    throw new ServiceError("not-found", `No quote for symbol: ${symbol}`);
  }

  const selectedExpiry = expirations[0] ?? null;
  if (!selectedExpiry) {
    return {
      quote,
      selectedExpiry: null,
      cards: [],
    };
  }

  const optimizerChainsByExpiry = await loadChainsByExpiry({
    provider,
    symbol,
    expiries: [selectedExpiry],
  });

  const candidates = runOptimizer({
    request: buildDefaultOptimizerRequest(symbol, quote, selectedExpiry),
    quote,
    chainsByExpiry: optimizerChainsByExpiry,
  });

  const bestByStrategy = Object.values(
    Object.fromEntries(
      candidates.map((candidate) => [candidate.strategyName, candidate]),
    ),
  );

  const analyticsChainsByExpiry = await loadChainsByExpiry({
    provider,
    symbol,
    expiries: bestByStrategy.flatMap((candidate) =>
      getOptionExpiries(candidate.builderState.legs),
    ),
    initialChainsByExpiry: optimizerChainsByExpiry,
  });

  return {
    quote,
    selectedExpiry,
    cards: bestByStrategy.map((candidate) => ({
      candidate,
      detail: calculateStrategyAnalytics({
        builderState: candidate.builderState,
        quote,
        chainsByExpiry: analyticsChainsByExpiry,
      }),
    })),
  };
}

function buildDefaultOptimizerRequest(
  symbol: string,
  quote: UnderlyingQuote,
  targetDate: string,
): OptimizerRequest {
  return {
    symbol,
    targetPrice: quote.last,
    targetDate,
    objective: "expectedProfit",
    maxLegs: 2,
    strikeWindow: 2,
    horizonDays: 30,
    riskFreeRate: 0.04,
    commissions: { perContract: 0.65, perLegFee: 0.1 },
    ivOverrides: { byExpiry: {} },
    grid: { pricePoints: 7, datePoints: 3, priceRangePct: 0.25 },
  };
}
