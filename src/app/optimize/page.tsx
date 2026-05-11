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
    <main>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <header>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            Options Planner
          </p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight">
            Strategy Optimizer
          </h1>
        </header>
        <Suspense fallback={<Spinner className="h-96 w-full" />}>
          <OptimizeContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
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
