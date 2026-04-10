import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import * as market from "@/modules/market";
import { optionIndexSchema } from "@/modules/market/schemas";
import { GET } from "./route";

function request(url: string) {
  return new NextRequest(new URL(url, "http://localhost"));
}

const metadataEnvelopeSchema = z.object({ data: optionIndexSchema });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/options/metadata", () => {
  it("returns 200 with expirations and strikes for a known symbol", async () => {
    const res = await GET(
      request("http://localhost/api/options/metadata?symbol=AAPL"),
    );
    expect(res.status).toBe(200);

    const body = metadataEnvelopeSchema.parse(await res.json());
    expect(body.data.symbol).toBe("AAPL");
    expect(body.data.expirations.length).toBeGreaterThan(0);
    expect(body.data.expirations[0]?.calls.length).toBeGreaterThan(0);
    expect(body.data.expirations[0]?.puts.length).toBeGreaterThan(0);
  });

  it("returns 400 when symbol is missing", async () => {
    const res = await GET(request("http://localhost/api/options/metadata"));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR", message: "Invalid query parameters" },
    });
  });

  it("returns empty expirations for unknown symbol", async () => {
    const res = await GET(
      request("http://localhost/api/options/metadata?symbol=ZZZZ"),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      data: { symbol: "ZZZZ", expirations: [] },
    });
  });

  it("returns 500 JSON when metadata loading throws", async () => {
    vi.spyOn(market, "getOptionMetadata").mockRejectedValue(new Error("boom"));

    const res = await GET(
      request("http://localhost/api/options/metadata?symbol=AAPL"),
    );

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error",
      },
    });
  });
});
