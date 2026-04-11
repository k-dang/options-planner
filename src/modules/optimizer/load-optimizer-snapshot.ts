import { getErrorMessage } from "@/modules/errors";
import { runOptimizerForSymbol } from "@/modules/optimizer/run-optimizer";
import type { OptimizerRunResponse } from "@/modules/optimizer/schemas";
import {
  type OptimizerObjective,
  optimizerRunRequestSchema,
} from "@/modules/optimizer/schemas";

export type OptimizerRunInput = {
  symbol: string;
  targetPrice?: number;
  targetDate?: string;
  objective?: OptimizerObjective;
  maxLoss?: number;
};

export type OptimizerSnapshotResult =
  | {
      ok: false;
      error: string;
    }
  | {
      ok: true;
      data: OptimizerRunResponse["data"];
    };

export async function loadOptimizerSnapshot(
  input: OptimizerRunInput,
): Promise<OptimizerSnapshotResult> {
  const parsed = optimizerRunRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid optimizer input.",
    };
  }

  try {
    const data = await runOptimizerForSymbol(parsed.data);
    return {
      ok: true,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error),
    };
  }
}
