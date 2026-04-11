import {
  useBuilderCalcQuery,
  useOptionsMetadataQuery,
} from "@/hooks/use-builder-queries";
import type { BuilderStateInput } from "@/modules/strategies/schemas";

export function useBuilderData(args: {
  initialState: BuilderStateInput | null;
  horizonDays: number | null;
  legs: BuilderStateInput["legs"];
}) {
  const builderInput =
    args.initialState === null || args.horizonDays === null
      ? null
      : {
          ...args.initialState,
          horizonDays: args.horizonDays,
          legs: args.legs,
        };

  const calcQuery = useBuilderCalcQuery(builderInput);
  const optionsIndexQuery = useOptionsMetadataQuery(
    args.initialState?.symbol ?? null,
  );

  return {
    builderInput,
    calcData: calcQuery.data ?? null,
    marketError:
      calcQuery.error?.message ?? optionsIndexQuery.error?.message ?? null,
    isFetching: calcQuery.isFetching,
    optionIndex: optionsIndexQuery.data ?? null,
  };
}
