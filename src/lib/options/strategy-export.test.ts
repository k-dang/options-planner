import { describe, expect, it } from "vitest";
import { formatStrategyExport } from "./strategy-export";
import type { StrategyState } from "./types";

describe("strategy export", () => {
  it("renders an option-only strategy as exact Markdown and human-readable JSON", () => {
    const state: StrategyState = {
      version: 1,
      strategy: "long-call",
      symbol: "spy",
      underlyingPrice: 512.34,
      asOf: "2026-04-24T16:00:00.000Z",
      legs: [
        {
          kind: "option",
          optionType: "call",
          side: "long",
          quantity: 2,
          expiration: "2026-05-24",
          strike: 520,
          premium: 9,
          impliedVolatility: 0.28,
        },
      ],
    };

    const result = formatStrategyExport(state);

    expect(result.markdown).toBe(
      "# SPY Long Call\n\n- Buy 2 SPY $520 call contracts expiring 2026-05-24",
    );
    expect(JSON.parse(result.json)).toEqual({
      symbol: "SPY",
      strategy: "Long Call",
      legs: [
        {
          action: "buy",
          quantity: 2,
          unit: "contract",
          instrument: "call",
          strike: 520,
          expiration: "2026-05-24",
        },
      ],
    });
    expect(result.json).toContain('\n  "symbol": "SPY",');
    expect(result.json).toContain('\n    {\n      "action": "buy",');
    expect(result.json).not.toContain("\t");
  });

  it("renders a mixed stock-and-option strategy in Builder order", () => {
    const state: StrategyState = {
      version: 1,
      strategy: "covered-call",
      symbol: "aapl",
      underlyingPrice: 172,
      asOf: "2026-04-24T16:00:00.000Z",
      legs: [
        {
          kind: "stock",
          side: "long",
          quantity: 100,
          entryPrice: 172,
        },
        {
          kind: "option",
          optionType: "call",
          side: "short",
          quantity: 1,
          expiration: "2026-05-24",
          strike: 175,
          premium: 5,
          impliedVolatility: 0.27,
        },
      ],
    };

    const result = formatStrategyExport(state);

    expect(result.markdown).toBe(
      [
        "# AAPL Covered Call",
        "",
        "- Buy 100 AAPL shares",
        "- Sell 1 AAPL $175 call contract expiring 2026-05-24",
      ].join("\n"),
    );
    expect(JSON.parse(result.json)).toEqual({
      symbol: "AAPL",
      strategy: "Covered Call",
      legs: [
        {
          action: "buy",
          quantity: 100,
          unit: "share",
          instrument: "stock",
        },
        {
          action: "sell",
          quantity: 1,
          unit: "contract",
          instrument: "call",
          strike: 175,
          expiration: "2026-05-24",
        },
      ],
    });
  });

  it("preserves all four Iron Condor legs and excludes internal or market fields", () => {
    const state: StrategyState = {
      version: 1,
      strategy: "iron-condor",
      symbol: "iwm",
      underlyingPrice: 202.45,
      asOf: "2026-04-24T16:00:00.000Z",
      legs: [
        optionLeg("put", "long", 190, 1.35),
        optionLeg("put", "short", 195, 2.4),
        optionLeg("call", "short", 210, 2.15),
        optionLeg("call", "long", 215, 1.1),
      ],
    };

    const result = formatStrategyExport(state);

    expect(result.markdown).toBe(
      [
        "# IWM Iron Condor",
        "",
        "- Buy 1 IWM $190 put contract expiring 2026-05-24",
        "- Sell 1 IWM $195 put contract expiring 2026-05-24",
        "- Sell 1 IWM $210 call contract expiring 2026-05-24",
        "- Buy 1 IWM $215 call contract expiring 2026-05-24",
      ].join("\n"),
    );
    expect(JSON.parse(result.json)).toEqual({
      symbol: "IWM",
      strategy: "Iron Condor",
      legs: [
        {
          action: "buy",
          quantity: 1,
          unit: "contract",
          instrument: "put",
          strike: 190,
          expiration: "2026-05-24",
        },
        {
          action: "sell",
          quantity: 1,
          unit: "contract",
          instrument: "put",
          strike: 195,
          expiration: "2026-05-24",
        },
        {
          action: "sell",
          quantity: 1,
          unit: "contract",
          instrument: "call",
          strike: 210,
          expiration: "2026-05-24",
        },
        {
          action: "buy",
          quantity: 1,
          unit: "contract",
          instrument: "call",
          strike: 215,
          expiration: "2026-05-24",
        },
      ],
    });

    for (const excludedField of [
      "version",
      "iron-condor",
      "underlyingPrice",
      "asOf",
      "premium",
      "impliedVolatility",
      "entryPrice",
      "provider",
      "greeks",
      "probabilityOfProfit",
    ]) {
      expect(`${result.markdown}\n${result.json}`).not.toContain(excludedField);
    }
  });

  it("uses the singular share unit for a one-share stock leg", () => {
    const state: StrategyState = {
      version: 1,
      strategy: "covered-call",
      symbol: "AAPL",
      underlyingPrice: 172,
      asOf: "2026-04-24T16:00:00.000Z",
      legs: [
        {
          kind: "stock",
          side: "long",
          quantity: 1,
          entryPrice: 172,
        },
        optionLeg("call", "short", 175, 5),
      ],
    };

    expect(formatStrategyExport(state).markdown).toContain(
      "- Buy 1 AAPL share\n",
    );
  });
});

function optionLeg(
  optionType: "call" | "put",
  side: "long" | "short",
  strike: number,
  premium: number,
): Extract<StrategyState["legs"][number], { kind: "option" }> {
  return {
    kind: "option",
    optionType,
    side,
    quantity: 1,
    expiration: "2026-05-24",
    strike,
    premium,
    impliedVolatility: 0.28,
  };
}
