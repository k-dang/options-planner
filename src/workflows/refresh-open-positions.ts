import { revalidatePath } from "next/cache";
import { getWorkflowMetadata, sleep } from "workflow";
import {
  getPositionRefreshWorkflowState,
  recordPositionRefreshWorkflowError,
  recordPositionRefreshWorkflowResult,
} from "@/db/position-refresh-workflow-state";
import { refreshOpenSavedStrategies } from "@/db/saved-strategies";

const MIN_INTERVAL_SECONDS = 60;

export async function refreshOpenPositionsWorkflow() {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  await sleep("1s");

  while (await shouldContinueRefreshing(workflowRunId)) {
    await refreshOpenPositionsStep();

    const intervalSeconds = await getRefreshIntervalSeconds(workflowRunId);
    await sleep(`${intervalSeconds}s`);
  }
}

async function shouldContinueRefreshing(runId: string) {
  "use step";

  const state = await getPositionRefreshWorkflowState();
  return state.enabled && state.runId === runId;
}

async function getRefreshIntervalSeconds(runId: string) {
  "use step";

  const state = await getPositionRefreshWorkflowState();
  if (!state.enabled || state.runId !== runId) {
    return MIN_INTERVAL_SECONDS;
  }

  return Math.max(state.intervalSeconds, MIN_INTERVAL_SECONDS);
}

async function refreshOpenPositionsStep() {
  "use step";

  try {
    const results = await refreshOpenSavedStrategies();
    const failed = results.filter((result) => !result.ok).length;

    await recordPositionRefreshWorkflowResult({
      refreshed: results.length - failed,
      failed,
      total: results.length,
    });
    revalidatePath("/positions");
  } catch (error) {
    await recordPositionRefreshWorkflowError(error);
    throw error;
  }
}
