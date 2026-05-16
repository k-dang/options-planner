"use server";

import { revalidatePath } from "next/cache";
import { createSavedStrategyFromEntry } from "@/db/saved-strategies";
import { type StrategyState, safeEvaluateStrategy } from "@/lib/options";

export type SaveStrategyResult =
  | { ok: true; id: string; name: string }
  | { ok: false; error: string };

export async function saveBuilderStrategy(
  state: StrategyState,
): Promise<SaveStrategyResult> {
  const result = safeEvaluateStrategy(state);

  if (!result.valid) {
    return { ok: false, error: result.errors.join(" ") };
  }

  try {
    const saved = await createSavedStrategyFromEntry(state);
    revalidatePath("/positions");

    return { ok: true, id: saved.id, name: saved.name };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to save this strategy.",
    };
  }
}
