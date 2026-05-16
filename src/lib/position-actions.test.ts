import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  closeSavedStrategyAtMarketMark: vi.fn(),
  deleteSavedStrategy: vi.fn(),
  refreshOpenSavedStrategies: vi.fn(),
  refreshSavedStrategyMark: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/db/saved-strategies", () => ({
  closeSavedStrategyAtMarketMark: mocks.closeSavedStrategyAtMarketMark,
  deleteSavedStrategy: mocks.deleteSavedStrategy,
  refreshOpenSavedStrategies: mocks.refreshOpenSavedStrategies,
  refreshSavedStrategyMark: mocks.refreshSavedStrategyMark,
}));

import {
  closePositionAction,
  deletePositionAction,
  refreshAllOpenPositionsAction,
  refreshPositionAction,
} from "./position-actions";

const initialState = { ok: true, message: null };

function formData(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

describe("position actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("refreshPositionAction", () => {
    it("rejects when id is missing", async () => {
      const result = await refreshPositionAction(initialState, new FormData());

      expect(result).toEqual({
        ok: false,
        message: "Missing saved strategy id.",
      });
      expect(mocks.refreshSavedStrategyMark).not.toHaveBeenCalled();
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });

    it("refreshes one saved strategy", async () => {
      mocks.refreshSavedStrategyMark.mockResolvedValue({ id: "snapshot-1" });

      const result = await refreshPositionAction(
        initialState,
        formData({ id: "strategy-1" }),
      );

      expect(result).toEqual({ ok: true, message: null });
      expect(mocks.refreshSavedStrategyMark).toHaveBeenCalledWith("strategy-1");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/positions");
    });

    it("surfaces data-layer error messages", async () => {
      mocks.refreshSavedStrategyMark.mockRejectedValue(
        new Error("Quote unavailable"),
      );

      const result = await refreshPositionAction(
        initialState,
        formData({ id: "strategy-1" }),
      );

      expect(result).toEqual({ ok: false, message: "Quote unavailable" });
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });

    it("falls back to a generic message for non-Error throws", async () => {
      mocks.refreshSavedStrategyMark.mockRejectedValue("boom");

      const result = await refreshPositionAction(
        initialState,
        formData({ id: "strategy-1" }),
      );

      expect(result).toEqual({
        ok: false,
        message: "Could not refresh this strategy.",
      });
    });
  });

  describe("closePositionAction", () => {
    it("closes a saved strategy only with explicit intent", async () => {
      await expect(
        closePositionAction(initialState, formData({ id: "strategy-1" })),
      ).resolves.toEqual({
        ok: false,
        message: "Confirm close before submitting.",
      });
      expect(mocks.closeSavedStrategyAtMarketMark).not.toHaveBeenCalled();

      mocks.closeSavedStrategyAtMarketMark.mockResolvedValue({
        strategy: { id: "strategy-1" },
        snapshot: { id: "snapshot-1" },
      });

      const result = await closePositionAction(
        initialState,
        formData({ id: "strategy-1", intent: "close" }),
      );

      expect(result).toEqual({ ok: true, message: "Strategy closed." });
      expect(mocks.closeSavedStrategyAtMarketMark).toHaveBeenCalledWith(
        "strategy-1",
      );
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/positions");
    });

    it("rejects when id is missing", async () => {
      const result = await closePositionAction(
        initialState,
        formData({ intent: "close" }),
      );
      expect(result).toEqual({
        ok: false,
        message: "Missing saved strategy id.",
      });
    });
  });

  describe("deletePositionAction", () => {
    it("deletes a saved strategy only with explicit intent", async () => {
      await expect(
        deletePositionAction(initialState, formData({ id: "strategy-1" })),
      ).resolves.toEqual({
        ok: false,
        message: "Confirm delete before submitting.",
      });
      expect(mocks.deleteSavedStrategy).not.toHaveBeenCalled();

      mocks.deleteSavedStrategy.mockResolvedValue({ id: "strategy-1" });

      const result = await deletePositionAction(
        initialState,
        formData({ id: "strategy-1", intent: "delete" }),
      );

      expect(result).toEqual({ ok: true, message: "Strategy deleted." });
      expect(mocks.deleteSavedStrategy).toHaveBeenCalledWith("strategy-1");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/positions");
    });
  });

  describe("refreshAllOpenPositionsAction", () => {
    it("returns a benign message when there are no open strategies", async () => {
      mocks.refreshOpenSavedStrategies.mockResolvedValue([]);

      const result = await refreshAllOpenPositionsAction(initialState);

      expect(result).toEqual({
        ok: true,
        message: "No open strategies to refresh.",
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/positions");
    });

    it("summarises a fully successful refresh", async () => {
      mocks.refreshOpenSavedStrategies.mockResolvedValue([
        { id: "strategy-1", ok: true, message: null },
        { id: "strategy-2", ok: true, message: null },
      ]);

      const result = await refreshAllOpenPositionsAction(initialState);

      expect(result).toEqual({
        ok: true,
        message: "2 open strategies refreshed.",
      });
    });

    it("reports partial failures when refreshing all open strategies", async () => {
      mocks.refreshOpenSavedStrategies.mockResolvedValue([
        { id: "strategy-1", ok: true, message: null },
        { id: "strategy-2", ok: false, message: "Quote unavailable" },
      ]);

      const result = await refreshAllOpenPositionsAction(initialState);

      expect(result).toEqual({ ok: false, message: "1 refreshed, 1 failed." });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/positions");
    });

    it("surfaces unexpected errors from the data layer", async () => {
      mocks.refreshOpenSavedStrategies.mockRejectedValue(
        new Error("Database is down"),
      );

      const result = await refreshAllOpenPositionsAction(initialState);

      expect(result).toEqual({ ok: false, message: "Database is down" });
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });
  });
});
