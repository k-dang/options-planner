import type { Metadata } from "next";
import { Suspense } from "react";
import { getOptionChainProvider } from "@/lib/options/providers/registry";
import { singleValue } from "@/lib/utils";
import { OptimizeClient } from "./optimize-client";
import { OptimizeSkeleton } from "./optimize-skeleton";

export const metadata: Metadata = {
  title: "Optimize",
};

export default function OptimizePage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string | string[] }>;
}) {
  return (
    <main>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <header>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Options Planner
          </p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight">
            Strategy Optimizer
          </h1>
        </header>
        <Suspense fallback={<OptimizeSkeleton />}>
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
