import { parseBuilderState } from "@/lib/options";
import { BuilderClient } from "../../build-client";

export default async function BuildStrategyPage({
  params,
  searchParams,
}: {
  params: Promise<{ strategy: string; symbol: string }>;
  searchParams: Promise<{
    exp?: string | string[];
    strike?: string | string[];
    strike2?: string | string[];
    strike3?: string | string[];
    strike4?: string | string[];
    qty?: string | string[];
  }>;
}) {
  const route = await params;
  const query = await searchParams;
  const initialState = parseBuilderState({
    strategy: route.strategy,
    symbol: route.symbol,
    expiration: singleValue(query.exp),
    strike: singleValue(query.strike),
    strike2: singleValue(query.strike2),
    strike3: singleValue(query.strike3),
    strike4: singleValue(query.strike4),
    quantity: singleValue(query.qty),
  });

  return <BuilderClient initialState={initialState} />;
}

function singleValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
