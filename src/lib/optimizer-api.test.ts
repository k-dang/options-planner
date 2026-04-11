import { afterEach, describe, expect, it, vi } from "vitest";
import { runOptimizer } from "./optimizer-api";

describe("runOptimizer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an error when the optimizer response shape is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: { cards: [] } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(
      runOptimizer({
        symbol: "AAPL",
      }),
    ).resolves.toEqual({
      ok: false,
      error: "Received an invalid optimizer response.",
    });
  });

  it("returns an error when the optimizer response JSON is malformed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("{", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(
      runOptimizer({
        symbol: "AAPL",
      }),
    ).resolves.toEqual({
      ok: false,
      error: "Received malformed JSON from the optimizer.",
    });
  });
});
