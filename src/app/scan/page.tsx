import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { getOptionChainProvider } from "@/lib/options/providers/registry";
import { singleValue } from "@/lib/utils";
import { ScanClient } from "./scan-client";

export default function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<Spinner className="h-96 w-full" />}>
      <ScanContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ScanContent({
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
    <ScanClient
      initialChain={initialChain}
      key={initialChain.underlying.symbol}
    />
  );
}
