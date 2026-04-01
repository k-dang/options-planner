import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { optionChainSchema } from "@/modules/market/schemas";
import { GET } from "./route";

function request(url: string) {
  return new NextRequest(new URL(url, "http://localhost"));
}

const chainEnvelopeSchema = z.object({ data: optionChainSchema });

describe("GET /api/options/chain", () => {
  it("returns 200 with chain for known symbol and expiry", async () => {
    const res = await GET(
      request(
        "http://localhost/api/options/chain?symbol=AAPL&expiry=2026-04-17",
      ),
    );
    expect(res.status).toBe(200);
    const body = chainEnvelopeSchema.parse(await res.json());
    expect(body.data.symbol).toBe("AAPL");
    expect(body.data.expiry).toBe("2026-04-17");
    expect(body.data.contracts.length).toBeGreaterThan(0);
  });

  it("returns 400 when symbol is missing", async () => {
    const res = await GET(
      request("http://localhost/api/options/chain?expiry=2026-04-17"),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR", message: "Invalid query parameters" },
    });
  });

  it("returns 400 when expiry is missing", async () => {
    const res = await GET(
      request("http://localhost/api/options/chain?symbol=AAPL"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown expiry", async () => {
    const res = await GET(
      request(
        "http://localhost/api/options/chain?symbol=AAPL&expiry=2099-01-01",
      ),
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
