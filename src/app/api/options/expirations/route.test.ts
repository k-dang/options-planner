import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET } from "./route";

function request(url: string) {
  return new NextRequest(new URL(url, "http://localhost"));
}

describe("GET /api/options/expirations", () => {
  it("returns 200 with expirations for a known symbol", async () => {
    const res = await GET(
      request("http://localhost/api/options/expirations?symbol=SPY"),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      data: [
        "2026-04-17",
        "2026-04-24",
        "2026-05-01",
        "2026-05-08",
        "2026-05-15",
        "2026-06-19",
        "2026-07-17",
        "2026-08-21",
        "2026-09-18",
        "2026-10-16",
        "2026-11-20",
        "2026-12-18",
        "2027-01-15",
      ],
    });
  });

  it("returns 400 when symbol is missing", async () => {
    const res = await GET(request("http://localhost/api/options/expirations"));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR", message: "Invalid query parameters" },
    });
  });

  it("returns empty array for unknown symbol", async () => {
    const res = await GET(
      request("http://localhost/api/options/expirations?symbol=ZZZZ"),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ data: [] });
  });
});
