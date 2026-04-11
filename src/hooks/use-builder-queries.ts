import { useQuery } from "@tanstack/react-query";
import { calculateStrategy, getOptionsMetadata } from "@/lib/builder-api";
import type { BuilderStateInput } from "@/modules/strategies/schemas";

export function useBuilderCalcQuery(builderState: BuilderStateInput | null) {
  return useQuery({
    queryKey: ["builder-calc", builderState],
    queryFn: async () => {
      if (builderState === null) {
        throw new Error("Builder state is required to calculate strategy.");
      }

      return calculateStrategy(builderState);
    },
    enabled: builderState !== null,
  });
}

export function useOptionsMetadataQuery(symbol: string | null) {
  return useQuery({
    queryKey: ["builder-options-metadata", symbol],
    queryFn: async () => {
      if (symbol === null) {
        throw new Error("A symbol is required to load option metadata.");
      }

      return getOptionsMetadata(symbol);
    },
    enabled: symbol !== null,
  });
}
