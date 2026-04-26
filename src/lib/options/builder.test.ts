import { describe, expect, it } from "vitest";
import {
  createBuilderState,
  evaluateStrategy,
  parseBuilderState,
  serializeBuilderState,
} from "./index";

describe("builder strategy state", () => {
  it("loads a deterministic symbol default from the generated chain", () => {
    const state = createBuilderState({ symbol: "msft" });

    expect(state.symbol).toBe("MSFT");
    expect(state.underlyingPrice).toBe(421);
    expect(state.strategy).toBe("long-call");
    expect(state.legs[0]).toMatchObject({
      kind: "option",
      optionType: "call",
      side: "long",
      quantity: 1,
    });
    expect(evaluateStrategy(state).capitalRequired).toBeGreaterThan(0);
  });

  it("can switch the supported builder template", () => {
    const strategies = [
      "long-call",
      "long-put",
      "covered-call",
      "cash-secured-put",
      "bull-call-spread",
      "bear-put-spread",
    ] as const;

    for (const strategy of strategies) {
      const state = createBuilderState({
        symbol: "AAPL",
        strategy,
      });

      expect(state.strategy).toBe(strategy);
      expect(evaluateStrategy(state).payoff.length).toBeGreaterThan(0);
    }
  });

  it("models covered calls with stock and a short call", () => {
    const state = createBuilderState({
      symbol: "AAPL",
      strategy: "covered-call",
      strike: 175,
    });

    expect(state.legs).toHaveLength(2);
    expect(state.legs[0]).toMatchObject({
      kind: "stock",
      side: "long",
      quantity: 100,
      entryPrice: 172,
    });
    expect(state.legs[1]).toMatchObject({
      kind: "option",
      optionType: "call",
      side: "short",
      strike: 175,
    });
    expect(evaluateStrategy(state).capitalRequired).toBeGreaterThan(16_000);
  });

  it("models cash-secured puts as short puts with strike-backed capital", () => {
    const state = createBuilderState({
      symbol: "AAPL",
      strategy: "cash-secured-put",
      strike: 170,
    });
    const evaluation = evaluateStrategy(state);

    expect(state.legs[0]).toMatchObject({
      kind: "option",
      optionType: "put",
      side: "short",
      strike: 170,
    });
    expect(evaluation.netPremium).toBeGreaterThan(0);
    expect(evaluation.capitalRequired).toBeLessThan(17_000);
  });

  it("applies editable option inputs to the evaluated strategy", () => {
    const state = createBuilderState({
      symbol: "SPY",
      strategy: "long-call",
      expiration: "2026-05-24",
      strike: 520,
      quantity: 2,
    });
    const evaluation = evaluateStrategy(state);

    expect(state.legs[0]).toMatchObject({
      kind: "option",
      expiration: "2026-05-24",
      strike: 520,
      premium: 11.35,
      quantity: 2,
    });
    expect(evaluation.netPremium).toBe(-2270);
    expect(evaluation.capitalRequired).toBe(2270);
  });

  it("restores the same builder state from explicit route and query params", () => {
    const state = createBuilderState({
      symbol: "TSLA",
      strategy: "bear-put-spread",
      strike: 180,
      strike2: 170,
      quantity: 3,
    });
    const restored = parseBuilderState({
      strategy: "bear-put-spread",
      symbol: "TSLA",
      strike: "180",
      strike2: "170",
      quantity: "3",
    });

    expect(restored).toEqual(state);
    expect(serializeBuilderState(restored)).toBe(
      "/build/bear-put-spread/TSLA?exp=2026-05-24&strike=180&qty=3&strike2=170",
    );
  });

  it("encodes dynamic route segments when serializing", () => {
    const state = createBuilderState({ symbol: "BRK/B" });
    const serialized = serializeBuilderState(state);
    const [path, query = ""] = serialized.split("?");

    expect(path).toBe("/build/long-call/BRK%2FB");
    expect(new URLSearchParams(query).get("exp")).toBe("2026-05-24");
    expect(new URLSearchParams(query).get("qty")).toBe("1");
  });
});
