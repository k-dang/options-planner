import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { optimizerResponseSchema } from "@/domain";
import { POST } from "./route";

function request(url: string, body: unknown) {
  return new NextRequest(new URL(url, "http://localhost"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("POST /api/optimizer/run", () => {
  it("returns ranked candidates for the requested expiry only", async () => {
    const res = await POST(
      request("http://localhost/api/optimizer/run", {
        symbol: "AAPL",
        targetPrice: 225,
        targetDate: "2026-04-17",
        objective: "expectedProfit",
        maxLegs: 2,
        strikeWindow: 2,
      }),
    );

    expect(res.status).toBe(200);
    const body = optimizerResponseSchema.parse(await res.json());
    expect(body.data.candidates.length).toBeGreaterThan(0);
    expect(body.data.candidates[0].strategyName).toBeDefined();
    expect(
      body.data.candidates.every((candidate) =>
        candidate.builderState.legs.every(
          (leg) => leg.kind !== "option" || leg.expiry === "2026-04-17",
        ),
      ),
    ).toBe(true);
  });

  it("returns 404 when the requested expiry has no chain", async () => {
    const res = await POST(
      request("http://localhost/api/optimizer/run", {
        symbol: "AAPL",
        targetPrice: 225,
        targetDate: "2099-01-01",
        objective: "expectedProfit",
        maxLegs: 2,
        strikeWindow: 2,
      }),
    );

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({
      error: {
        code: "NOT_FOUND",
        message: "No option chain for symbol AAPL and expiry 2099-01-01",
      },
    });
  });

  it("returns 400 for invalid payloads", async () => {
    const res = await POST(
      request("http://localhost/api/optimizer/run", {
        symbol: "AAPL",
      }),
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
    });
  });
});
