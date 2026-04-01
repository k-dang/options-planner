import { ServiceError } from "@/modules/errors";
import { getMarketDataProvider } from "@/modules/market";
import { calculateStrategyAnalytics } from "./analytics";
import { getOptionExpiries, loadChainsByExpiry } from "./option-chains";
import type { BuilderState } from "./types";

export async function calculateStrategyFromBuilderState(
  builderState: BuilderState,
) {
  const provider = getMarketDataProvider();
  const quote = await provider.getQuote(builderState.symbol);
  if (!quote) {
    throw new ServiceError(
      "not-found",
      `No quote for symbol: ${builderState.symbol}`,
    );
  }

  const chainsByExpiry = await loadChainsByExpiry({
    provider,
    symbol: builderState.symbol,
    expiries: getOptionExpiries(builderState.legs),
  });

  try {
    return calculateStrategyAnalytics({
      builderState,
      quote,
      chainsByExpiry,
    });
  } catch (error) {
    throw new ServiceError(
      "calculation",
      error instanceof Error ? error.message : "Strategy calculation failed",
    );
  }
}
