import type { BuilderLeg, BuilderState, OptionChain } from "@/domain";
import { calculateStrategyAnalytics } from "@/engine";
import { getMarketDataProvider, type MarketDataProvider } from "@/providers";
import { ServiceError } from "./service-errors";

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

export function getOptionExpiries(legs: BuilderLeg[]) {
  return [
    ...new Set(
      legs
        .filter((leg) => leg.kind === "option")
        .map((leg) => leg.expiry)
        .filter((expiry): expiry is string => Boolean(expiry)),
    ),
  ];
}

export async function loadChainsByExpiry({
  provider,
  symbol,
  expiries,
  initialChainsByExpiry = {},
}: {
  provider: MarketDataProvider;
  symbol: string;
  expiries: Iterable<string>;
  initialChainsByExpiry?: Record<string, OptionChain>;
}) {
  const expiriesToLoad = [...new Set(expiries)].filter(
    (expiry) => !(expiry in initialChainsByExpiry),
  );

  if (expiriesToLoad.length === 0) {
    return initialChainsByExpiry;
  }

  const chains = await Promise.all(
    expiriesToLoad.map(async (expiry) => ({
      expiry,
      chain: await provider.getChain(symbol, expiry),
    })),
  );

  const missingExpiry = chains.find((item) => item.chain === null)?.expiry;
  if (missingExpiry) {
    throw new ServiceError(
      "not-found",
      `No option chain for symbol ${symbol} and expiry ${missingExpiry}`,
    );
  }

  return {
    ...initialChainsByExpiry,
    ...Object.fromEntries(
      chains
        .filter(
          (
            item,
          ): item is {
            expiry: string;
            chain: NonNullable<(typeof chains)[number]["chain"]>;
          } => item.chain !== null,
        )
        .map((item) => [item.expiry, item.chain]),
    ),
  };
}
