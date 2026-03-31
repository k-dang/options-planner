import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { optimizerRunResponseSchema } from "@/domain";
import * as providers from "@/providers";
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/optimizer/run", () => {
  it("returns quote, selected expiry, and hydrated cards", async () => {
    const res = await POST(
      request("http://localhost/api/optimizer/run", {
        symbol: "AAPL",
      }),
    );

    expect(res.status).toBe(200);
    const body = optimizerRunResponseSchema.parse(await res.json());
    expect(body.data.quote.symbol).toBe("AAPL");
    expect(body.data.selectedExpiry).toBe("2026-04-17");
    expect(body.data.cards.length).toBeGreaterThan(0);
    expect(body.data.cards[0].candidate.strategyName).toBeDefined();
    expect(
      body.data.cards.every((card) =>
        card.candidate.builderState.legs.every(
          (leg) => leg.kind !== "option" || leg.expiry === "2026-04-17",
        ),
      ),
    ).toBe(true);
    expect(
      body.data.cards.every((card) => card.detail.chart.series.length > 0),
    ).toBe(true);
  });

  it("returns 404 for an unknown symbol", async () => {
    const res = await POST(
      request("http://localhost/api/optimizer/run", {
        symbol: "ZZZZ",
      }),
    );

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({
      error: {
        code: "NOT_FOUND",
        message: "No quote for symbol: ZZZZ",
      },
    });
  });

  it("returns an empty result when quote exists but no expirations are available", async () => {
    vi.spyOn(providers, "getMarketDataProvider").mockReturnValue({
      searchSymbols: async () => [],
      getQuote: async () => ({
        symbol: "AAPL",
        name: "Apple Inc.",
        last: 225,
        bid: 224.9,
        ask: 225.1,
        previousClose: 223,
        currency: "USD",
      }),
      getExpirations: async () => [],
      getChain: async () => null,
    });

    const res = await POST(
      request("http://localhost/api/optimizer/run", {
        symbol: "AAPL",
      }),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      data: {
        quote: {
          symbol: "AAPL",
          name: "Apple Inc.",
          last: 225,
          bid: 224.9,
          ask: 225.1,
          previousClose: 223,
          currency: "USD",
        },
        selectedExpiry: null,
        cards: [],
      },
    });
  });

  it("returns 400 for invalid payloads", async () => {
    const res = await POST(request("http://localhost/api/optimizer/run", {}));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
    });
  });

  it("returns 500 JSON when the provider throws", async () => {
    vi.spyOn(providers, "getMarketDataProvider").mockReturnValue({
      searchSymbols: async () => [],
      getQuote: async () => {
        throw new Error("boom");
      },
      getExpirations: async () => [],
      getChain: async () => null,
    });

    const res = await POST(
      request("http://localhost/api/optimizer/run", {
        symbol: "AAPL",
      }),
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
