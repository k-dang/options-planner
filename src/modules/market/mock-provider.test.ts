import { describe, expect, it } from "vitest";
import { MockMarketDataProvider } from "./mock-provider";

describe("MockMarketDataProvider", () => {
  const p = new MockMarketDataProvider();

  it("returns all symbols sorted when query is empty", async () => {
    const r = await p.searchSymbols("");
    expect(r.map((x) => x.symbol)).toEqual(["AAPL", "MSFT", "SPY"]);
  });

  it("filters deterministically by symbol prefix", async () => {
    const r = await p.searchSymbols("ms");
    expect(r.map((x) => x.symbol)).toEqual(["MSFT"]);
  });

  it("returns quote or null", async () => {
    const q = await p.getQuote("AAPL");
    expect(q?.symbol).toBe("AAPL");
    expect(await p.getQuote("ZZZZ")).toBeNull();
  });

  it("returns expirations for known symbol", async () => {
    const e = await p.getExpirations("SPY");
    expect(e).toEqual([
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
    ]);
  });

  it("returns chain for known symbol and expiry", async () => {
    const c = await p.getChain("AAPL", "2026-04-17");
    expect(c?.symbol).toBe("AAPL");
    expect(c?.expiry).toBe("2026-04-17");
    expect(c?.contracts.length).toBeGreaterThan(0);
    expect(c?.contracts[0]).toMatchObject({
      exerciseStyle: "american",
      multiplier: 100,
    });
    expect(c?.contracts[0].volume).toBeGreaterThan(0);
    expect(c?.contracts[0].openInterest).toBeGreaterThan(0);
  });

  it("returns null for unknown expiry", async () => {
    expect(await p.getChain("AAPL", "2099-01-01")).toBeNull();
  });
});
