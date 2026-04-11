"use server";

import {
  type BuilderSnapshot,
  loadBuilderSnapshot,
} from "@/modules/builder/load-builder-snapshot";
import type { BuilderStateInput } from "@/modules/strategies/schemas";

export async function loadBuilderSnapshotAction(
  input: BuilderStateInput,
): Promise<BuilderSnapshot> {
  return loadBuilderSnapshot(input);
}
