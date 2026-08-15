import type { Metadata } from "next";
import { getOptionChainProvider } from "@/lib/options/providers/registry";
import { singleValue } from "@/lib/utils";
import { ScanClient } from "./scan-client";

export const metadata: Metadata = {
  title: "Scan",
};

export default function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string | string[] }>;
}) {
  const initialChain = loadInitialChain(searchParams);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <header>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            Options Planner
          </p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight">
            Risk/Reward Scanner
          </h1>
        </header>
        <ScanClient initialChain={initialChain} />
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
