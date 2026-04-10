import BuilderClient from "@/components/builder-client";
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

  return (
    <BuilderClient
      key={`${resolvedParams.strategyId}:${resolvedParams.symbol}:${resolvedParams.legs}`}
      initialBuilderState={initialState.builderState}
      initialError={initialState.error}
    />
  );
}
