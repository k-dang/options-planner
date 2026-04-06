import type { UseMutationOptions } from "@tanstack/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  runOptimizer as runOptimizerRequest,
  searchSymbols,
} from "@/lib/optimizer-api";

type RunOptimizerInput = Parameters<typeof runOptimizerRequest>[0];

type OptimizerControls = {
  targetPrice: number | null;
  selectedExpiration: string | null;
  objective: NonNullable<RunOptimizerInput["objective"]>;
  budget: number | null;
};

type RunOptimizerOverrides = {
  [Key in keyof Omit<RunOptimizerInput, "symbol">]?:
    | Omit<RunOptimizerInput, "symbol">[Key]
    | null;
};

export type RunOptimizationMutationInput = {
  symbolToRun: string;
  overrides?: RunOptimizerOverrides;
};

export type RunOptimizerMutationResult = {
  symbolToRun: string;
  optimizerResponse: Awaited<ReturnType<typeof runOptimizerRequest>>;
};

export function useSymbolSearchQuery(symbol: string, searchEnabled: boolean) {
  return useQuery({
    queryKey: ["symbol-search", symbol],
    queryFn: async () => {
      const matches = await searchSymbols(symbol);
      return matches.slice(0, 6);
    },
    enabled: searchEnabled && symbol.length > 0,
  });
}

export function useRunOptimizerMutation({
  controls,
  mutation,
}: {
  controls: OptimizerControls;
  mutation?: UseMutationOptions<
    RunOptimizerMutationResult,
    Error,
    RunOptimizationMutationInput,
    { sequence: number }
  >;
}) {
  return useMutation({
    mutationFn: async ({
      symbolToRun,
      overrides,
    }: RunOptimizationMutationInput): Promise<RunOptimizerMutationResult> => ({
      symbolToRun,
      optimizerResponse: await runOptimizerRequest(
        buildOptimizerInput(symbolToRun, controls, overrides),
      ),
    }),
    ...mutation,
  });
}

function buildOptimizerInput(
  symbol: string,
  controls: OptimizerControls,
  overrides?: RunOptimizerOverrides,
): RunOptimizerInput {
  return {
    symbol,
    targetPrice: overrides?.targetPrice ?? controls.targetPrice ?? undefined,
    targetDate:
      overrides?.targetDate ?? controls.selectedExpiration ?? undefined,
    objective: overrides?.objective ?? controls.objective,
    maxLoss: overrides?.maxLoss ?? controls.budget ?? undefined,
  };
}
