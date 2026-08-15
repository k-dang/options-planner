import type { Metadata } from "next";
import { getOptionChainProvider } from "@/lib/options/providers/registry";
import { singleValue } from "@/lib/utils";
import { OptimizeClient } from "./optimize-client";

export const metadata: Metadata = {
  title: "Optimize",
};

export default function OptimizePage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string | string[] }>;
}) {
  const initialChain = loadInitialChain(searchParams);

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
        <OptimizeClient initialChain={initialChain} />
      </div>
    </main>
  );
}

async function loadInitialChain(
  searchParams: Promise<{ symbol?: string | string[] }>,
) {
  const query = await searchParams;
  const symbol = singleValue(query.symbol)?.trim().toUpperCase() || "AAPL";

  return getOptionChainProvider().getChain({
    symbol,
  });
}
