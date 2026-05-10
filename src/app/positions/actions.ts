"use server";

import { revalidatePath } from "next/cache";
import { refreshSavedStrategyMark } from "@/lib/saved-strategies";

export type RefreshPositionState = {
  ok: boolean;
  message: string | null;
};

export async function refreshPositionAction(
  _previousState: RefreshPositionState,
  formData: FormData,
): Promise<RefreshPositionState> {
  const id = formData.get("id");

  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, message: "Missing saved strategy id." };
  }

  try {
    await refreshSavedStrategyMark(id);
    revalidatePath("/positions");
    return { ok: true, message: null };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not refresh this strategy.",
    };
  }
}
