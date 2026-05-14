import { eq } from "drizzle-orm";
import { getDb, positionRefreshWorkflows } from "@/db";

const SINGLETON_ID = "open_positions";
const DEFAULT_INTERVAL_SECONDS = 14_400;

export async function getPositionRefreshWorkflowState() {
  const db = getDb();
  const [state] = await db
    .select()
    .from(positionRefreshWorkflows)
    .where(eq(positionRefreshWorkflows.id, SINGLETON_ID))
    .limit(1);

  if (state) {
    return state;
  }

  const [created] = await db
    .insert(positionRefreshWorkflows)
    .values({
      id: SINGLETON_ID,
      enabled: false,
      intervalSeconds: DEFAULT_INTERVAL_SECONDS,
    })
    .returning();

  if (!created) {
    throw new Error("Position refresh workflow state could not be created.");
  }

  return created;
}

export async function enablePositionRefreshWorkflow(
  runId: string,
  intervalSeconds = DEFAULT_INTERVAL_SECONDS,
) {
  const db = getDb();
  const now = new Date();

  await db
    .insert(positionRefreshWorkflows)
    .values({
      id: SINGLETON_ID,
      enabled: true,
      runId,
      intervalSeconds,
      lastStartedAt: now,
      lastError: null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: positionRefreshWorkflows.id,
      set: {
        enabled: true,
        runId,
        intervalSeconds,
        lastStartedAt: now,
        lastError: null,
        updatedAt: now,
      },
    });
}

export async function disablePositionRefreshWorkflow() {
  const db = getDb();
  const now = new Date();

  const [updated] = await db
    .update(positionRefreshWorkflows)
    .set({
      enabled: false,
      runId: null,
      lastStoppedAt: now,
      updatedAt: now,
    })
    .where(eq(positionRefreshWorkflows.id, SINGLETON_ID))
    .returning();

  return updated ?? null;
}

export async function recordPositionRefreshWorkflowResult(result: {
  refreshed: number;
  failed: number;
  total: number;
}) {
  const db = getDb();
  const now = new Date();

  await db
    .update(positionRefreshWorkflows)
    .set({
      lastRefreshAt: now,
      lastResult: result,
      lastError: null,
      updatedAt: now,
    })
    .where(eq(positionRefreshWorkflows.id, SINGLETON_ID));
}

export async function recordPositionRefreshWorkflowError(error: unknown) {
  const db = getDb();
  const now = new Date();
  const message =
    error instanceof Error ? error.message : "Position refresh failed.";

  await db
    .update(positionRefreshWorkflows)
    .set({
      lastError: message.slice(0, 500),
      updatedAt: now,
    })
    .where(eq(positionRefreshWorkflows.id, SINGLETON_ID));
}
