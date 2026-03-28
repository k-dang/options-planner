import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET } from "./route";

function request(url: string) {
  return new NextRequest(new URL(url, "http://localhost"));
}

describe("GET /api/market/quote", () => {
  it("returns 200 with quote for a known symbol", async () => {
    const res = await GET(
      request("http://localhost/api/market/quote?symbol=AAPL"),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      data: { symbol: "AAPL", name: "Apple Inc.", currency: "USD" },
    });
  });

  it("returns 400 when symbol is missing", async () => {
    const res = await GET(request("http://localhost/api/market/quote"));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR", message: "Invalid query parameters" },
    });
  });

  it("returns 404 for unknown symbol", async () => {
    const res = await GET(
      request("http://localhost/api/market/quote?symbol=ZZZZ"),
    );
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: "NOT_FOUND", message: "No quote for symbol: ZZZZ" },
    });
  });
});
