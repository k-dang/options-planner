import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refreshOpenSavedStrategies: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/db/saved-strategies", () => ({
  refreshOpenSavedStrategies: mocks.refreshOpenSavedStrategies,
}));

import { POST } from "./route";

function scheduleRequest(authorization?: string) {
  return new Request("http://localhost/api/positions/refresh", {
    method: "POST",
    headers: authorization ? { authorization } : {},
  });
}

describe("POST /api/positions/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-secret");
  });

  it("rejects a wrong token without refreshing", async () => {
    const response = await POST(scheduleRequest("Bearer nope"));

    expect(response.status).toBe(401);
    expect(mocks.refreshOpenSavedStrategies).not.toHaveBeenCalled();
  });

  it("fails closed when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await POST(scheduleRequest("Bearer "));

    expect(response.status).toBe(401);
    expect(mocks.refreshOpenSavedStrategies).not.toHaveBeenCalled();
  });

  it("refreshes open positions and revalidates the page", async () => {
    mocks.refreshOpenSavedStrategies.mockResolvedValue([
      { id: "a", ok: true, message: null },
    ]);

    const response = await POST(scheduleRequest("Bearer test-secret"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ refreshed: 1, failed: 0 });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/positions");
  });

  it("returns 500 on a partial failure so the run shows as failed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.refreshOpenSavedStrategies.mockResolvedValue([
      { id: "a", ok: true, message: null },
      { id: "b", ok: false, message: "chain unavailable" },
    ]);

    const response = await POST(scheduleRequest("Bearer test-secret"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ refreshed: 1, failed: 1 });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/positions");
  });
});
