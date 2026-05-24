import { describe, expect, it } from "vitest";
import {
  createGeneratedChain,
  evaluateStrategy,
  type StrategyState,
  strategyTemplates,
} from "./index";
import { calculateCapitalAtRisk } from "./monitoring";

describe("strategy template catalog", () => {
  it("exposes every built-in builder strategy", () => {
    expect(strategyTemplates.ids()).toEqual([
      "long-call",
      "long-put",
      "short-call",
      "short-put",
      "covered-call",
      "cash-secured-put",
      "bull-call-spread",
      "bear-put-spread",
      "bull-put-spread",
      "bear-call-spread",
      "iron-condor",
      "short-straddle",
      "short-strangle",
    ]);
    expect(strategyTemplates.all().map((template) => template.id)).toEqual(
      strategyTemplates.ids(),
    );
  });

  it("owns the default scan strategy policy", () => {
    expect(strategyTemplates.defaultScanStrategies()).toEqual([
      "bull-call-spread",
      "bear-put-spread",
      "bull-put-spread",
      "bear-call-spread",
      "iron-condor",
    ]);
  });

  it("builds every built-in template into a valid strategy state", () => {
    const chain = createGeneratedChain("AAPL");

    for (const strategy of strategyTemplates.ids()) {
      const state = strategyTemplates.build({ strategy, chain });

      expect(strategyTemplates.validate(state), strategy).toMatchObject({
        valid: true,
      });
      expect(evaluateStrategy(state).payoff.length, strategy).toBeGreaterThan(
        0,
      );
    }
  });

  it("builds deterministic defaults from the generated chain", () => {
    const state = strategyTemplates.build({ symbol: "msft" });

    expect(state.symbol).toBe("MSFT");
    expect(state.underlyingPrice).toBe(421);
    expect(state.strategy).toBe("long-call");
    expect(state.legs[0]).toMatchObject({
      kind: "option",
      optionType: "call",
      side: "long",
      quantity: 1,
    });
    expect(evaluateStrategy(state).netPremium).toBeLessThan(0);
  });

  it("builds stock-backed and collateral-backed income templates", () => {
    const coveredCall = strategyTemplates.build({
      symbol: "AAPL",
      strategy: "covered-call",
      strike: 175,
    });
    const cashSecuredPut = strategyTemplates.build({
      symbol: "AAPL",
      strategy: "cash-secured-put",
      strike: 170,
    });

    expect(coveredCall.legs).toHaveLength(2);
    expect(coveredCall.legs[0]).toMatchObject({
      kind: "stock",
      side: "long",
      quantity: 100,
      entryPrice: 172,
    });
    expect(coveredCall.legs[1]).toMatchObject({
      kind: "option",
      optionType: "call",
      side: "short",
      strike: 175,
    });
    expect(evaluateStrategy(coveredCall).maxProfit).toBeGreaterThan(0);
    expect(cashSecuredPut.legs[0]).toMatchObject({
      kind: "option",
      optionType: "put",
      side: "short",
      strike: 170,
    });
    expect(evaluateStrategy(cashSecuredPut).netPremium).toBeGreaterThan(0);
    expect(evaluateStrategy(cashSecuredPut).maxProfit).toBeGreaterThan(0);
  });

  it("applies explicit expiration, strike, and quantity inputs", () => {
    const state = strategyTemplates.build({
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
      premium: 9,
      quantity: 2,
    });
    expect(evaluation.netPremium).toBeCloseTo(-1800, 2);
    expect(evaluation.maxLoss).toBeCloseTo(-1800, 2);
  });

  it("treats role-based strikes and positional aliases equivalently", () => {
    const chain = createGeneratedChain("AAPL");
    const aliasState = strategyTemplates.build({
      strategy: "iron-condor",
      chain,
      strike: 160,
      strike2: 165,
      strike3: 180,
      strike4: 185,
      quantity: 2,
    });
    const roleState = strategyTemplates.build({
      strategy: "iron-condor",
      chain,
      strikes: {
        longPut: 160,
        shortPut: 165,
        shortCall: 180,
        longCall: 185,
      },
      quantity: 2,
    });

    expect(roleState.legs).toEqual(aliasState.legs);
  });

  it("rejects invalid template shape and strike ordering at the catalog boundary", () => {
    const invalid: StrategyState = {
      version: 1,
      strategy: "short-strangle",
      symbol: "AAPL",
      underlyingPrice: 172,
      asOf: "2026-04-24T16:00:00.000Z",
      legs: [
        {
          kind: "option",
          optionType: "put",
          side: "short",
          quantity: 1,
          expiration: "2026-05-24",
          strike: 180,
          premium: 4,
          impliedVolatility: 0.28,
        },
        {
          kind: "option",
          optionType: "call",
          side: "short",
          quantity: 1,
          expiration: "2026-05-24",
          strike: 170,
          premium: 4,
          impliedVolatility: 0.28,
        },
      ],
    };

    expect(strategyTemplates.validate(invalid).errors).toContain(
      "short-strangle requires one lower-strike short put and one higher-strike short call with the same expiration.",
    );
  });

  it("validates hand-authored states for every supported strategy shape", () => {
    for (const state of representativeValidStates()) {
      expect(strategyTemplates.validate(state), state.strategy).toMatchObject({
        valid: true,
      });
    }
  });

  it("rejects mismatched template shape and vertical spread ordering", () => {
    const invalidCoveredCall: StrategyState = {
      ...representativeLongCall,
      strategy: "covered-call",
    };
    const invertedBullCall: StrategyState = {
      version: 1,
      strategy: "bull-call-spread",
      symbol: "SPY",
      underlyingPrice: 512,
      asOf: "2026-04-24T16:00:00.000Z",
      legs: [
        optionLeg({
          optionType: "call",
          side: "long",
          strike: 520,
          premium: 8,
        }),
        optionLeg({
          optionType: "call",
          side: "short",
          strike: 510,
          premium: 4,
        }),
      ],
    };

    expect(strategyTemplates.validate(invalidCoveredCall)).toMatchObject({
      valid: false,
    });
    expect(strategyTemplates.validate(invertedBullCall).errors).toContain(
      "bull-call-spread long call strike must be below short call strike.",
    );
  });

  it("generates optimizer seeds from thesis membership without optimizer tables", () => {
    const chain = createGeneratedChain("AAPL");
    const seeds = strategyTemplates.optimizerSeeds({
      thesis: "income",
      chain,
      targetUnderlyingPrice: chain.underlying.price,
      minDaysToExpiration: 20,
      maxDaysToExpiration: 70,
    });

    expect(seeds.length).toBeGreaterThan(0);
    expect(new Set(seeds.map((seed) => seed.strategy))).toEqual(
      new Set(strategyTemplates.optimizerStrategies("income")),
    );
    expect(
      seeds.every((seed) => {
        const state = strategyTemplates.build({
          strategy: seed.strategy,
          expiration: seed.expiration,
          strikes: seed.strikes,
          chain,
        });

        return strategyTemplates.validate(state).valid;
      }),
    ).toBe(true);
  });

  it("summarizes stable display and saved-name labels", () => {
    const state = strategyTemplates.build({
      symbol: "SPY",
      strategy: "bull-call-spread",
      expiration: "2026-05-24",
      strike: 510,
      strike2: 520,
    });

    expect(strategyTemplates.summarize(state)).toMatchObject({
      strategyLabel: "Bull Call Spread",
      expiration: "2026-05-24",
      strikeLabel: "510/520",
      savedName: "SPY 2026-05-24 510/520 Bull Call Spread",
    });
  });

  it("owns covered-call and cash-secured-put capital-at-risk hooks", () => {
    const coveredCall = strategyTemplates.build({
      strategy: "covered-call",
      strike: 175,
    });
    const cashSecuredPut = strategyTemplates.build({
      strategy: "cash-secured-put",
      strike: 170,
    });

    expect(
      strategyTemplates
        .get("covered-call")
        .monitoring?.capitalAtRisk?.(
          coveredCall,
          evaluateStrategy(coveredCall),
        ),
    ).toBe(calculateCapitalAtRisk(coveredCall, evaluateStrategy(coveredCall)));
    expect(
      strategyTemplates
        .get("cash-secured-put")
        .monitoring?.capitalAtRisk?.(
          cashSecuredPut,
          evaluateStrategy(cashSecuredPut),
        ),
    ).toBe(
      calculateCapitalAtRisk(cashSecuredPut, evaluateStrategy(cashSecuredPut)),
    );
  });
});

const representativeLongCall: StrategyState = {
  version: 1,
  strategy: "long-call",
  symbol: "AAPL",
  underlyingPrice: 172,
  asOf: "2026-04-24T16:00:00.000Z",
  legs: [
    optionLeg({
      optionType: "call",
      side: "long",
      strike: 170,
      premium: 6.5,
    }),
  ],
};

function representativeValidStates(): StrategyState[] {
  return [
    representativeLongCall,
    {
      ...representativeLongCall,
      strategy: "long-put",
      legs: [
        optionLeg({
          optionType: "put",
          side: "long",
          strike: 175,
          premium: 7.2,
        }),
      ],
    },
    {
      ...representativeLongCall,
      strategy: "short-call",
      legs: [
        optionLeg({
          optionType: "call",
          side: "short",
          strike: 175,
          premium: 5,
        }),
      ],
    },
    {
      ...representativeLongCall,
      strategy: "short-put",
      legs: [
        optionLeg({
          optionType: "put",
          side: "short",
          strike: 170,
          premium: 6,
        }),
      ],
    },
    {
      ...representativeLongCall,
      strategy: "covered-call",
      legs: [
        {
          kind: "stock",
          side: "long",
          quantity: 100,
          entryPrice: 172,
        },
        optionLeg({
          optionType: "call",
          side: "short",
          strike: 175,
          premium: 5,
        }),
      ],
    },
    {
      ...representativeLongCall,
      strategy: "cash-secured-put",
      legs: [
        optionLeg({
          optionType: "put",
          side: "short",
          strike: 170,
          premium: 6,
        }),
      ],
    },
    {
      ...representativeLongCall,
      strategy: "bull-call-spread",
      legs: [
        optionLeg({
          optionType: "call",
          side: "long",
          strike: 170,
          premium: 6.5,
        }),
        optionLeg({
          optionType: "call",
          side: "short",
          strike: 180,
          premium: 2.8,
        }),
      ],
    },
    {
      ...representativeLongCall,
      strategy: "bear-put-spread",
      legs: [
        optionLeg({
          optionType: "put",
          side: "long",
          strike: 175,
          premium: 7.2,
        }),
        optionLeg({
          optionType: "put",
          side: "short",
          strike: 165,
          premium: 3.1,
        }),
      ],
    },
    {
      ...representativeLongCall,
      strategy: "bull-put-spread",
      legs: [
        optionLeg({
          optionType: "put",
          side: "short",
          strike: 170,
          premium: 6,
        }),
        optionLeg({
          optionType: "put",
          side: "long",
          strike: 160,
          premium: 2,
        }),
      ],
    },
    {
      ...representativeLongCall,
      strategy: "bear-call-spread",
      legs: [
        optionLeg({
          optionType: "call",
          side: "short",
          strike: 175,
          premium: 5,
        }),
        optionLeg({
          optionType: "call",
          side: "long",
          strike: 185,
          premium: 2,
        }),
      ],
    },
    {
      ...representativeLongCall,
      strategy: "iron-condor",
      legs: [
        optionLeg({
          optionType: "put",
          side: "long",
          strike: 160,
          premium: 2,
        }),
        optionLeg({
          optionType: "put",
          side: "short",
          strike: 165,
          premium: 4,
        }),
        optionLeg({
          optionType: "call",
          side: "short",
          strike: 180,
          premium: 4,
        }),
        optionLeg({
          optionType: "call",
          side: "long",
          strike: 185,
          premium: 2,
        }),
      ],
    },
    {
      ...representativeLongCall,
      strategy: "short-straddle",
      legs: [
        optionLeg({
          optionType: "call",
          side: "short",
          strike: 170,
          premium: 6,
        }),
        optionLeg({
          optionType: "put",
          side: "short",
          strike: 170,
          premium: 6,
        }),
      ],
    },
    {
      ...representativeLongCall,
      strategy: "short-strangle",
      legs: [
        optionLeg({
          optionType: "put",
          side: "short",
          strike: 165,
          premium: 4,
        }),
        optionLeg({
          optionType: "call",
          side: "short",
          strike: 180,
          premium: 4,
        }),
      ],
    },
  ];
}

function optionLeg(
  overrides: Partial<
    Extract<StrategyState["legs"][number], { kind: "option" }>
  >,
): Extract<StrategyState["legs"][number], { kind: "option" }> {
  return {
    kind: "option",
    optionType: "call",
    side: "long",
    quantity: 1,
    expiration: "2026-05-24",
    strike: 170,
    premium: 6,
    impliedVolatility: 0.28,
    ...overrides,
  };
}
