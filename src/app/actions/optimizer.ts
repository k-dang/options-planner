"use server";

import {
  loadOptimizerSnapshot,
  type OptimizerRunInput,
  type OptimizerSnapshotResult,
} from "@/modules/optimizer/load-optimizer-snapshot";

export async function runOptimizerAction(
  input: OptimizerRunInput,
): Promise<OptimizerSnapshotResult> {
  return loadOptimizerSnapshot(input);
}
