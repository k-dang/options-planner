import { getOptionChainProvider } from "@/lib/options/providers/registry";
import { OptimizeClient } from "./optimize-client";

export default async function OptimizePage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string | string[] }>;
}) {
  const query = await searchParams;
  const symbol = singleValue(query.symbol)?.trim().toUpperCase() || "AAPL";

  const initialChain = await getOptionChainProvider().getChain({
    symbol,
  });

  return (
    <OptimizeClient
      initialChain={initialChain}
      key={initialChain.underlying.symbol}
    />
  );
}

function singleValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
