import { getErrorMessage } from "@/modules/errors";
import { getOptionMetadata, type OptionIndex } from "@/modules/market";
import { calculateStrategyFromBuilderState } from "@/modules/strategies/calculate-strategy";
import {
  type BuilderStateInput,
  builderStateSchema,
  type StrategyCalcResponse,
} from "@/modules/strategies/schemas";

export type BuilderSnapshot = {
  calcData: StrategyCalcResponse["data"] | null;
  marketError: string | null;
  optionIndex: OptionIndex | null;
};

const EMPTY_BUILDER_SNAPSHOT: BuilderSnapshot = {
  calcData: null,
  marketError: null,
  optionIndex: null,
};

export async function loadBuilderSnapshot(
  input: BuilderStateInput,
): Promise<BuilderSnapshot> {
  const parsed = builderStateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ...EMPTY_BUILDER_SNAPSHOT,
      marketError: "Invalid strategy configuration.",
    };
  }

  const [calcResult, optionIndexResult] = await Promise.allSettled([
    calculateStrategyFromBuilderState(parsed.data),
    getOptionMetadata(parsed.data.symbol),
  ]);

  return {
    calcData:
      calcResult.status === "fulfilled"
        ? calcResult.value
        : EMPTY_BUILDER_SNAPSHOT.calcData,
    marketError:
      calcResult.status === "rejected"
        ? getErrorMessage(calcResult.reason)
        : optionIndexResult.status === "rejected"
          ? getErrorMessage(optionIndexResult.reason)
          : null,
    optionIndex:
      optionIndexResult.status === "fulfilled"
        ? optionIndexResult.value
        : EMPTY_BUILDER_SNAPSHOT.optionIndex,
  };
}
