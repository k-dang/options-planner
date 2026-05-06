import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { parseBuilderState } from "@/lib/options";
import { getOptionChainProvider } from "@/lib/options/providers/registry";
import { singleValue } from "@/lib/utils";
import { BuilderClient } from "../../build-client";

type SearchParams = Promise<{
  exp?: string | string[];
  strike?: string | string[];
  strike2?: string | string[];
  strike3?: string | string[];
  strike4?: string | string[];
  qty?: string | string[];
}>;

type Params = Promise<{ strategy: string; symbol: string }>;

export default function BuildStrategyPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<Spinner className="h-96 w-full" />}>
      <BuildContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function BuildContent({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const route = await params;
  const query = await searchParams;
  const chain = await getOptionChainProvider().getChain({
    symbol: route.symbol,
  });
  const initialState = parseBuilderState(
    {
      strategy: route.strategy,
      symbol: chain.underlying.symbol,
      expiration: singleValue(query.exp),
      strike: singleValue(query.strike),
      strike2: singleValue(query.strike2),
      strike3: singleValue(query.strike3),
      strike4: singleValue(query.strike4),
      quantity: singleValue(query.qty),
    },
    chain,
  );

  return <BuilderClient initialChain={chain} initialState={initialState} />;
}
