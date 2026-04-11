import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { symbolSearchResponseSchema } from "@/modules/market/schemas";
import { GET } from "./route";

function request(url: string) {
  return new NextRequest(new URL(url, "http://localhost"));
}

describe("GET /api/market/symbols", () => {
  it("returns 200 with sorted symbols when q is empty", async () => {
    const res = await GET(request("http://localhost/api/market/symbols"));
    expect(res.status).toBe(200);
    const body = symbolSearchResponseSchema.parse(await res.json());
    expect(body).toEqual({
      data: [
        { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
        { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ" },
        { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", exchange: "ARCA" },
      ],
    });
  });

  it("filters by query", async () => {
    const res = await GET(request("http://localhost/api/market/symbols?q=ms"));
    expect(res.status).toBe(200);
    const body = symbolSearchResponseSchema.parse(await res.json());
    expect(body).toEqual({
      data: [
        { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ" },
      ],
    });
  });
});
