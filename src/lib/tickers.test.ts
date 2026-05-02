import { describe, expect, it } from "vitest";
import { searchTickerSuggestions } from "./tickers";

describe("searchTickerSuggestions", () => {
  it("returns a capped default list for an empty query", () => {
    const results = searchTickerSuggestions("");

    expect(results).toHaveLength(8);
    expect(results[0]?.symbol).toBe("AAPL");
  });

  it("matches ticker prefixes before company names", () => {
    const results = searchTickerSuggestions("m");

    expect(results.map((result) => result.symbol).slice(0, 2)).toEqual([
      "MSFT",
      "META",
    ]);
  });

  it("matches company name substrings after ticker prefixes", () => {
    const results = searchTickerSuggestions("bank");

    expect(results.map((result) => result.symbol)).toEqual(["BAC"]);
  });

  it("does not block unknown symbols", () => {
    expect(searchTickerSuggestions("ZZZZ")).toEqual([]);
  });
});
