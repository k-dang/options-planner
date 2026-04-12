import { describe, expect, it } from "vitest";
import type { BuilderStateInput } from "@/modules/strategies/schemas";
import { getNextBuilderDraftState } from "./use-builder-draft";

const builderState: BuilderStateInput = {
  symbol: "AAPL",
  templateName: "Long Call",
  horizonDays: 30,
  riskFreeRate: 0.04,
  commissions: {
    perContract: 0.65,
    perLegFee: 0.1,
  },
  ivOverrides: {
    byExpiry: {},
  },
  grid: {
    pricePoints: 7,
    datePoints: 3,
    priceRangePct: 0.25,
  },
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
};

describe("getNextBuilderDraftState", () => {
  it("composes multiple updates from the latest draft state", () => {
    const afterQuantity = getNextBuilderDraftState(builderState, {
      type: "update-leg-quantity",
      index: 0,
      value: 2,
    });

    const afterHorizon = getNextBuilderDraftState(afterQuantity, {
      type: "update-horizon-days",
      value: 45,
    });

    expect(afterHorizon).toEqual({
      ...builderState,
      horizonDays: 45,
      legs: [
        {
          ...builderState.legs[0],
          qty: 2,
        },
      ],
    });
  });

  it("updates expiry and snaps strike to the closest available strike", () => {
    const nextState = getNextBuilderDraftState(builderState, {
      type: "update-option-leg-expiry",
      index: 0,
      expiry: "2026-07-17",
      optionIndex: {
        symbol: "AAPL",
        expirations: [
          {
            expiry: "2026-07-17",
            calls: [205, 212.5, 220],
            puts: [200, 210, 220],
          },
        ],
      },
    });

    expect(nextState).toEqual({
      ...builderState,
      legs: [
        {
          ...builderState.legs[0],
          expiry: "2026-07-17",
          strike: 212.5,
        },
      ],
    });
  });

  it("returns the same state when an option-only action targets a non-option leg", () => {
    const stockState: BuilderStateInput = {
      ...builderState,
      legs: [
        {
          kind: "stock",
          side: "buy",
          qty: 100,
          entryPriceMode: "mark",
        },
      ],
    };

    expect(
      getNextBuilderDraftState(stockState, {
        type: "update-option-leg-strike",
        index: 0,
        strike: 50,
      }),
    ).toBe(stockState);
  });
});
