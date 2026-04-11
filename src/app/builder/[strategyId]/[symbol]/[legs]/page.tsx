import BuilderClient from "@/components/builder/builder-client";
import { parseBuilderStateFromRouteParams } from "@/lib/builder-state-url";
import { loadBuilderSnapshot } from "@/modules/builder/load-builder-snapshot";

export default async function BuilderPage({
  params,
}: {
  params: Promise<{
    strategyId: string;
    symbol: string;
    legs: string;
  }>;
}) {
  const resolvedParams = await params;
  const initialState = parseBuilderStateFromRouteParams(resolvedParams);

  if (initialState.status === "ready") {
    const initialSnapshot = await loadBuilderSnapshot(
      initialState.builderState,
    );

    return (
      <BuilderClient
        initialSnapshot={initialSnapshot}
        key={`${resolvedParams.strategyId}:${resolvedParams.symbol}:${resolvedParams.legs}`}
        status="ready"
        builderState={initialState.builderState}
      />
    );
  }

  return (
    <BuilderClient
      initialSnapshot={null}
      key={`${resolvedParams.strategyId}:${resolvedParams.symbol}:${resolvedParams.legs}`}
      status="unavailable"
      message={initialState.message}
    />
  );
}
