import { describe, expect, it } from "vitest";
import { formatTargetPriceDraft, parseTargetPriceDraft } from "./target-price";

describe("target price", () => {
  it.each(["", "   "])("rejects an empty value", (draft) => {
    expect(parseTargetPriceDraft(draft)).toEqual({
      valid: false,
      message: "Enter a target price.",
    });
  });

  it.each([
    "0",
    "-1",
    "0.001",
  ])("rejects a non-positive cent value", (draft) => {
    expect(parseTargetPriceDraft(draft)).toEqual({
      valid: false,
      message: "Target price must be at least $0.01.",
    });
  });

  it("rejects a number outside the finite JavaScript range", () => {
    expect(parseTargetPriceDraft("1e309")).toEqual({
      valid: false,
      message: "Enter a valid target price.",
    });
  });

  it("normalizes valid prices to cents", () => {
    expect(parseTargetPriceDraft("341.236")).toEqual({
      valid: true,
      value: 341.24,
    });
    expect(formatTargetPriceDraft(341.2)).toBe("341.2");
  });

  it("rejects targets outside the supported payoff range", () => {
    expect(parseTargetPriceDraft("500", { low: 157.66, high: 472.98 })).toEqual(
      {
        valid: false,
        message:
          "Choose a target between $157.66 and $472.98 for this analysis.",
      },
    );
  });
});
