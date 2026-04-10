import { getMarketDataProvider } from "./provider";
import type { OptionChainContract, OptionIndex } from "./schemas";

export async function getOptionMetadata(symbol: string): Promise<OptionIndex> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const provider = getMarketDataProvider();
  const expirations = await provider.getExpirations(normalizedSymbol);
  const chains = await Promise.all(
    expirations.map(async (expiry) => ({
      expiry,
      chain: await provider.getChain(normalizedSymbol, expiry),
    })),
  );

  return {
    symbol: normalizedSymbol,
    expirations: chains
      .filter(
        (
          item,
        ): item is {
          expiry: string;
          chain: NonNullable<(typeof chains)[number]["chain"]>;
        } => item.chain !== null,
      )
      .map(({ expiry, chain }) => ({
        expiry,
        calls: getUniqueSortedStrikes(chain.contracts, "C"),
        puts: getUniqueSortedStrikes(chain.contracts, "P"),
      })),
  };
}

function getUniqueSortedStrikes(
  contracts: OptionChainContract[],
  right: "C" | "P",
) {
  return [
    ...new Set(
      contracts
        .filter((contract) => contract.right === right)
        .map((contract) => contract.strike),
    ),
  ].sort((left, rightValue) => left - rightValue);
}
