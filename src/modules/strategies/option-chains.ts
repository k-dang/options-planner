import { ServiceError } from "@/modules/errors";
import type { MarketDataProvider } from "@/modules/market";
import type { OptionChain } from "@/modules/market/schemas";
import type { BuilderLeg } from "./types";

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
