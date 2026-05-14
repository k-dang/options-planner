"use server";

import { revalidatePath } from "next/cache";
import { getRun, start } from "workflow/api";
import {
  disablePositionRefreshWorkflow,
  enablePositionRefreshWorkflow,
  getPositionRefreshWorkflowState,
} from "@/lib/position-refresh-workflow-state";
import {
  closeSavedStrategyAtMarketMark,
  deleteSavedStrategy,
  refreshOpenSavedStrategies,
  refreshSavedStrategyMark,
} from "@/lib/saved-strategies";
import { refreshOpenPositionsWorkflow } from "@/workflows/refresh-open-positions";

export type PositionActionState = {
  ok: boolean;
  message: string | null;
};

export async function refreshPositionAction(
  _previousState: PositionActionState,
  formData: FormData,
): Promise<PositionActionState> {
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

export async function closePositionAction(
  _previousState: PositionActionState,
  formData: FormData,
): Promise<PositionActionState> {
  const id = formData.get("id");
  const intent = formData.get("intent");

  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, message: "Missing saved strategy id." };
  }

  if (intent !== "close") {
    return { ok: false, message: "Confirm close before submitting." };
  }

  try {
    await closeSavedStrategyAtMarketMark(id);
    revalidatePath("/positions");
    return { ok: true, message: "Strategy closed." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not close strategy.",
    };
  }
}

export async function deletePositionAction(
  _previousState: PositionActionState,
  formData: FormData,
): Promise<PositionActionState> {
  const id = formData.get("id");
  const intent = formData.get("intent");

  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, message: "Missing saved strategy id." };
  }

  if (intent !== "delete") {
    return { ok: false, message: "Confirm delete before submitting." };
  }

  try {
    await deleteSavedStrategy(id);
    revalidatePath("/positions");
    return { ok: true, message: "Strategy deleted." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not delete strategy.",
    };
  }
}

export async function refreshAllOpenPositionsAction(
  _previousState: PositionActionState,
): Promise<PositionActionState> {
  try {
    const results = await refreshOpenSavedStrategies();
    revalidatePath("/positions");

    if (results.length === 0) {
      return { ok: true, message: "No open strategies to refresh." };
    }

    const failures = results.filter((result) => !result.ok);
    if (failures.length > 0) {
      return {
        ok: false,
        message: `${results.length - failures.length} refreshed, ${failures.length} failed.`,
      };
    }

    return {
      ok: true,
      message: `${results.length} open strategies refreshed.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not refresh open strategies.",
    };
  }
}

export async function startAutoRefreshPositionsAction() {
  const existing = await getPositionRefreshWorkflowState();
  const existingStatus = await getWorkflowStatus(existing.runId);

  if (
    existing.enabled &&
    existing.runId &&
    (existingStatus === "running" || existingStatus === "unknown")
  ) {
    revalidatePath("/positions");
    return;
  }

  const run = await start(refreshOpenPositionsWorkflow);
  await enablePositionRefreshWorkflow(run.runId, existing.intervalSeconds);

  await getRun(run.runId)
    .wakeUp()
    .catch(() => undefined);

  revalidatePath("/positions");
}

export async function stopAutoRefreshPositionsAction() {
  const previous = await disablePositionRefreshWorkflow();

  if (previous?.runId) {
    await getRun(previous.runId)
      .cancel()
      .catch(() => undefined);
  }

  revalidatePath("/positions");
}

async function getWorkflowStatus(runId: string | null) {
  if (!runId) {
    return null;
  }

  try {
    const run = getRun(runId);
    if (!(await run.exists)) {
      return "missing";
    }
    return await run.status;
  } catch {
    return "unknown";
  }
}
