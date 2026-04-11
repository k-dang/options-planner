import BuilderClient from "@/components/builder/builder-client";
import { parseBuilderStateFromRouteParams } from "@/lib/builder-state-url";

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
    return (
      <BuilderClient
        key={`${resolvedParams.strategyId}:${resolvedParams.symbol}:${resolvedParams.legs}`}
        status="ready"
        builderState={initialState.builderState}
      />
    );
  }

  return (
    <BuilderClient
      key={`${resolvedParams.strategyId}:${resolvedParams.symbol}:${resolvedParams.legs}`}
      status="unavailable"
      message={initialState.message}
    />
  );
}
