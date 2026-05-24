import { describe, expect, it } from "vitest";
import { type BuildStrategyInput, strategyTemplates } from "@/lib/options";
import { parsePositiveNumber } from "@/lib/utils";
import { strategyBuilderHref } from "./hrefs";

describe("strategy builder hrefs", () => {
  it("round trips explicit route and query params", () => {
    const state = strategyTemplates.build({
      symbol: "TSLA",
      strategy: "bear-put-spread",
      strike: 180,
      strike2: 170,
      quantity: 3,
    });
    const restored = buildFromRoute({
      strategy: "bear-put-spread",
      symbol: "TSLA",
      strike: "180",
      strike2: "170",
      quantity: "3",
    });

    expect(restored).toEqual(state);
    expect(strategyBuilderHref(restored)).toBe(
      "/build/bear-put-spread/TSLA?exp=2026-05-24&strike=180&qty=3&strike2=170",
    );
  });

  it("serializes four-leg iron condors with every editable strike", () => {
    const state = strategyTemplates.build({
      symbol: "AAPL",
      strategy: "iron-condor",
      strike: 160,
      strike2: 165,
      strike3: 180,
      strike4: 185,
      quantity: 2,
    });
    const restored = buildFromRoute({
      strategy: "iron-condor",
      symbol: "AAPL",
      strike: "160",
      strike2: "165",
      strike3: "180",
      strike4: "185",
      quantity: "2",
    });

    expect(restored.legs).toEqual(state.legs);
    expect(strategyBuilderHref(restored)).toBe(
      "/build/iron-condor/AAPL?exp=2026-05-24&strike=160&qty=2&strike2=165&strike3=180&strike4=185",
    );
  });

  it("encodes dynamic route segments when serializing", () => {
    const state = strategyTemplates.build({ symbol: "BRK/B" });
    const serialized = strategyBuilderHref(state);
    const [path, query = ""] = serialized.split("?");

    expect(path).toBe("/build/long-call/BRK%2FB");
    expect(new URLSearchParams(query).get("exp")).toBe("2026-05-24");
    expect(new URLSearchParams(query).get("qty")).toBe("1");
  });
});

function buildFromRoute(input: {
  strategy?: string;
  symbol?: string;
  expiration?: string;
  strike?: string;
  strike2?: string;
  strike3?: string;
  strike4?: string;
  quantity?: string;
}) {
  return strategyTemplates.build({
    symbol: input.symbol,
    strategy: strategyTemplates.coerce(input.strategy),
    expiration: input.expiration,
    strike: parsePositiveNumber(input.strike),
    strike2: parsePositiveNumber(input.strike2),
    strike3: parsePositiveNumber(input.strike3),
    strike4: parsePositiveNumber(input.strike4),
    quantity: parsePositiveNumber(input.quantity),
  } satisfies BuildStrategyInput);
}
