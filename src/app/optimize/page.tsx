import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { getOptionChainProvider } from "@/lib/options/providers/registry";
import { singleValue } from "@/lib/utils";
import { OptimizeClient } from "./optimize-client";

export default function OptimizePage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<Spinner className="h-96 w-full" />}>
      <OptimizeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function OptimizeContent({
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
