import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { strategyCalcResponseSchema } from "@/domain";
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

describe("POST /api/strategies/calc", () => {
  it("returns analytics for a valid strategy payload", async () => {
    const res = await POST(
      request("http://localhost/api/strategies/calc", {
        builderState: {
          symbol: "AAPL",
          horizonDays: 30,
          riskFreeRate: 0.04,
          commissions: { perContract: 0.65, perLegFee: 0.1 },
          ivOverrides: { byExpiry: {}, global: 0.3 },
          grid: { pricePoints: 5, datePoints: 3, priceRangePct: 0.2 },
          legs: [
            {
              kind: "option",
              side: "buy",
              qty: 1,
              right: "C",
              strike: 212.5,
              expiry: "2026-04-17",
              entryPriceMode: "mark",
            },
          ],
        },
      }),
    );

    expect(res.status).toBe(200);
    const body = strategyCalcResponseSchema.parse(await res.json());
    expect(body.data.grid.prices).toHaveLength(5);
    expect(body.data.grid.dates).toHaveLength(3);
    expect(body.data.summary.maxProfit).toBeNull();
  });

  it("returns 400 when the payload is invalid", async () => {
    const res = await POST(
      request("http://localhost/api/strategies/calc", {
        builderState: {
          symbol: "AAPL",
        },
      }),
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
    });
  });

  it("returns 404 when an option chain is missing", async () => {
    const res = await POST(
      request("http://localhost/api/strategies/calc", {
        builderState: {
          symbol: "AAPL",
          horizonDays: 30,
          riskFreeRate: 0.04,
          commissions: { perContract: 0.65, perLegFee: 0.1 },
          ivOverrides: { byExpiry: {}, global: 0.3 },
          grid: { pricePoints: 5, datePoints: 3, priceRangePct: 0.2 },
          legs: [
            {
              kind: "option",
              side: "buy",
              qty: 1,
              right: "C",
              strike: 212.5,
              expiry: "2099-01-01",
              entryPriceMode: "mark",
            },
          ],
        },
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
});
