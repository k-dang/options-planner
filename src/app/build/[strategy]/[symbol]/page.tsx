import type { Metadata } from "next";
import { Suspense } from "react";
import { BiasBadge, STRATEGY_BIAS } from "@/components/bias-badge";
import { strategyTemplates } from "@/lib/options";
import { getOptionChainProvider } from "@/lib/options/providers/registry";
import { parsePositiveNumber, singleValue } from "@/lib/utils";
import { BuilderClient } from "../../build-client";
import { BuildSkeleton } from "../../build-skeleton";
import { PositionBanner } from "../../position-banner";

type SearchParams = Promise<{
  exp?: string | string[];
  strike?: string | string[];
  strike2?: string | string[];
  strike3?: string | string[];
  strike4?: string | string[];
  qty?: string | string[];
  positionId?: string | string[];
}>;

type Params = Promise<{ strategy: string; symbol: string }>;

export const metadata: Metadata = {
  title: "Builder",
};

export default async function BuildStrategyPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  return (
    <main>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <header>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            Options Planner · Builder
          </p>
          <Suspense fallback={<BuildHeadingFallback />}>
            <BuildHeading params={params} />
          </Suspense>
        </header>
        <Suspense fallback={null}>
          <PositionBannerFromSearchParams searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<BuildSkeleton />}>
          <BuildContent params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function BuildHeading({ params }: { params: Params }) {
  const route = await params;
  const strategy = strategyTemplates.coerce(route.strategy);
  const symbol = route.symbol.trim().toUpperCase();

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-3">
      <h1 className="text-3xl font-bold tracking-tight">
        {strategyTemplates.get(strategy).label} on {symbol}
      </h1>
      <BiasBadge bias={STRATEGY_BIAS[strategy]} />
    </div>
  );
}

function BuildHeadingFallback() {
  return (
    <h1 className="mt-1.5 text-3xl font-bold tracking-tight">
      Strategy Builder
    </h1>
  );
}

async function PositionBannerFromSearchParams({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const positionId = singleValue((await searchParams).positionId);

  if (!positionId) {
    return null;
  }

  return <PositionBanner positionId={positionId} />;
}

async function BuildContent({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [route, query] = await Promise.all([params, searchParams]);
  const chain = await getOptionChainProvider().getChain({
    symbol: route.symbol,
  });
  const initialState = strategyTemplates.build({
    strategy: strategyTemplates.coerce(route.strategy),
    symbol: chain.underlying.symbol,
    expiration: singleValue(query.exp),
    strike: parsePositiveNumber(singleValue(query.strike)),
    strike2: parsePositiveNumber(singleValue(query.strike2)),
    strike3: parsePositiveNumber(singleValue(query.strike3)),
    strike4: parsePositiveNumber(singleValue(query.strike4)),
    quantity: parsePositiveNumber(singleValue(query.qty)),
    chain,
  });

  return <BuilderClient initialChain={chain} initialState={initialState} />;
}
