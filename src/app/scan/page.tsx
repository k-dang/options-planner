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
        <Suspense fallback={<Spinner className="h-96 w-full" />}>
          <ScanContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
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
