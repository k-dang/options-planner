import { describe, expect, it } from "vitest";
import {
  parseBuilderStateFromRouteParams,
  serializeBuilderStateForUrl,
} from "./builder-state-url";
import type { BuilderStateInput } from "@/modules/strategies/schemas";

const builderState: BuilderStateInput = {
  symbol: "AAPL",
  templateName: "Long Call",
  horizonDays: 30,
  riskFreeRate: 0.04,
  commissions: {
    perContract: 0.65,
    perLegFee: 0,
  },
  ivOverrides: {
    byExpiry: {},
  },
  grid: {
    pricePoints: 25,
    datePoints: 10,
    priceRangePct: 0.2,
  },
  legs: [
    {
      kind: "option",
      side: "buy",
      qty: 1,
      right: "C",
      strike: 210,
      expiry: "2026-06-19",
      entryPriceMode: "mid",
    },
  ],
};

const decimalStrikeBuilderState: BuilderStateInput = {
  ...builderState,
  templateName: "Bull Call Spread",
  legs: [
    {
      kind: "option",
      side: "buy",
      qty: 1,
      right: "C",
      strike: 202.5,
      expiry: "2026-04-17",
      entryPriceMode: "mark",
    },
    {
      kind: "option",
      side: "sell",
      qty: 1,
      right: "C",
      strike: 212.5,
      expiry: "2026-04-17",
      entryPriceMode: "mark",
    },
  ],
};

describe("builder state URL helpers", () => {
  it("serializes a compact builder route and parses it back", () => {
    const serialized = serializeBuilderStateForUrl({
      strategyName: "Long Call",
      builderState,
    });
    const [, , strategyId, symbol, legs] = serialized.split("/");
    const parsed = parseBuilderStateFromRouteParams({
      strategyId,
      symbol,
      legs,
    });

    expect(serialized).toBe("/builder/long-call/AAPL/+.AAPL260619C210");
    expect(parsed).toEqual({
      builderState: {
        ...builderState,
        horizonDays: 30,
        riskFreeRate: 0.04,
        commissions: { perContract: 0.65, perLegFee: 0.1 },
        ivOverrides: { byExpiry: {} },
        grid: { pricePoints: 7, datePoints: 3, priceRangePct: 0.25 },
        legs: [
          {
            ...builderState.legs[0],
            entryPriceMode: "mark",
          },
        ],
        templateName: "Long Call",
      },
      error: null,
    });
  });

  it("returns the empty-state message when route params are missing", () => {
    expect(parseBuilderStateFromRouteParams({})).toEqual({
      builderState: null,
      error: "Open the builder from an optimizer result to load a strategy.",
    });
  });

  it("returns a parse error for malformed leg tokens", () => {
    expect(
      parseBuilderStateFromRouteParams({
        strategyId: "long-call",
        symbol: "AAPL",
        legs: "not-a-leg",
      }),
    ).toEqual({
      builderState: null,
      error: "The builder route could not be parsed.",
    });
  });

  it("returns an invalid-route error when tokens do not match the template", () => {
    expect(
      parseBuilderStateFromRouteParams({
        strategyId: "bull-put-spread",
        symbol: "TSLA",
        legs: "+.TSLA260619P280,-.TSLA260619P510",
      }),
    ).toEqual({
      builderState: null,
      error: "The builder route could not be parsed.",
    });
  });

  it("parses optimizer-style decimal strike routes", () => {
    const serialized = serializeBuilderStateForUrl({
      strategyName: "Bull Call Spread",
      builderState: decimalStrikeBuilderState,
    });
    const [, , strategyId, symbol, legs] = serialized.split("/");

    expect(serialized).toBe(
      "/builder/bull-call-spread/AAPL/+.AAPL260417C202.5,-.AAPL260417C212.5",
    );
    expect(
      parseBuilderStateFromRouteParams({
        strategyId,
        symbol,
        legs,
      }),
    ).toEqual({
      builderState: {
        symbol: "AAPL",
        templateName: "Bull Call Spread",
        horizonDays: 30,
        riskFreeRate: 0.04,
        commissions: { perContract: 0.65, perLegFee: 0.1 },
        ivOverrides: { byExpiry: {} },
        grid: { pricePoints: 7, datePoints: 3, priceRangePct: 0.25 },
        legs: decimalStrikeBuilderState.legs,
      },
      error: null,
    });
  });

  it("parses encoded and lowercase route params", () => {
    expect(
      parseBuilderStateFromRouteParams({
        strategyId: "long-call",
        symbol: "aapl",
        legs: "%2b.aapl260619c210",
      }),
    ).toEqual({
      builderState: {
        symbol: "AAPL",
        templateName: "Long Call",
        horizonDays: 30,
        riskFreeRate: 0.04,
        commissions: { perContract: 0.65, perLegFee: 0.1 },
        ivOverrides: { byExpiry: {} },
        grid: { pricePoints: 7, datePoints: 3, priceRangePct: 0.25 },
        legs: [
          {
            kind: "option",
            side: "buy",
            qty: 1,
            right: "C",
            strike: 210,
            expiry: "2026-06-19",
            entryPriceMode: "mark",
          },
        ],
      },
      error: null,
    });
  });
});
