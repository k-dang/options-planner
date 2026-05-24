## Problem

Strategy template semantics are currently shallow and spread across several modules:

- Builder state construction decides default expirations, quote selection, leg ordering, and positional strike mapping.
- Strategy validation redefines each template's required shape.
- Evaluation owns template-specific breakeven and probability rules.
- Optimizer owns thesis membership, candidate strike recipes, scan modes, and display labels.
- Monitoring owns saved-strategy naming and capital-at-risk exceptions.

The coupling is not accidental. A `StrategyTemplateId` is a domain concept with many consequences: leg shape, strike ordering, valid payoff structure, optimizer generation, saved-position behavior, and UI labeling. Today, adding or changing a strategy requires synchronized edits across `builder`, `strategy`, `evaluate`, `optimizer`, and `monitoring`. That creates integration risk because each file can understand the same strategy slightly differently.

This also makes tests more brittle than they need to be. Many tests assert behavior through shallow helpers, but the real risk is at the template boundary: given a strategy template, chain, strikes, and quantity, does the app build a valid state, evaluate it consistently, rank it correctly, and persist/read it with the right semantics?

## Proposed Interface

Introduce an in-process `strategyTemplates` catalog as the single semantic boundary for built-in strategy templates.

The catalog should preserve current low-ceremony callers while moving template-specific rules behind one module.

```ts
export const strategyTemplates: StrategyTemplateCatalog;

export type StrategyTemplateCatalog = {
  all(): readonly StrategyTemplate[];
  ids(): readonly StrategyTemplateId[];
  coerce(id?: string): StrategyTemplateId;
  get(id?: string): StrategyTemplate;

  build(input?: BuildStrategyInput): StrategyState;
  validate(state: StrategyState): ValidationResult;
  summarize(state: StrategyState): StrategySummary;

  optimizerStrategies(thesis: OptimizerThesis): readonly StrategyTemplateId[];
  optimizerSeeds(input: OptimizerSeedInput): OptimizerSeed[];
};
```

Each template owns declarative metadata first, with hooks only where the domain rule is genuinely strategy-specific.

```ts
export type StrategyTemplate = {
  id: StrategyTemplateId;
  label: string;
  shape:
    | "single-option"
    | "stock-plus-option"
    | "vertical-spread"
    | "short-volatility"
    | "iron-condor";
  biases: readonly StrategyBias[];
  optimizerTheses: readonly OptimizerThesis[];
  scanMode: "single-strike" | "template-variants";

  defaults: StrategyTemplateDefaults;
  legs: readonly StrategyTemplateLegSpec[];

  validate?(state: StrategyState): string[];
  evaluation?: StrategyTemplateEvaluationHooks;
  monitoring?: StrategyTemplateMonitoringHooks;
  optimizer?: StrategyTemplateOptimizerHooks;
};
```

Builder inputs should support both current positional strike aliases and a role-based form. Positional aliases keep the migration small; role-based strikes are the long-term interface.

```ts
export type BuildStrategyInput = {
  symbol?: string;
  strategy?: StrategyTemplateId;
  expiration?: string;
  quantity?: number;
  chain?: OptionChainSnapshot;

  strikes?: Partial<Record<TemplateRole, number>>;

  strike?: number;
  strike2?: number;
  strike3?: number;
  strike4?: number;
};
```

Usage stays familiar for default callers:

```ts
const state = strategyTemplates.build({
  symbol: "AAPL",
  strategy: "iron-condor",
  chain,
});

const validation = strategyTemplates.validate(state);
const summary = strategyTemplates.summarize(state);
```

Optimizer code becomes catalog-driven rather than maintaining its own strategy tables:

```ts
for (const seed of strategyTemplates.optimizerSeeds({
  thesis: inputs.thesis,
  chain,
  targetUnderlyingPrice,
  minDaysToExpiration: inputs.minDaysToExpiration,
  maxDaysToExpiration: inputs.maxDaysToExpiration,
})) {
  const state = strategyTemplates.build({
    symbol,
    strategy: seed.strategy,
    expiration: seed.expiration,
    strikes: seed.strikes,
    quantity: seed.quantity,
    chain,
  });

  tryAddCandidate(candidates, baseInputs, state);
}
```

Existing exports such as `createBuilderState` and `validateStrategyState` should become thin compatibility wrappers around the catalog during migration.

```ts
export function createBuilderState(input?: BuildStrategyInput): StrategyState {
  return strategyTemplates.build(input);
}

export function validateStrategyState(state: StrategyState): ValidationResult {
  return strategyTemplates.validate(state);
}
```

## Dependency Strategy

Dependency category: **In-process**.

The strategy template catalog should be pure TypeScript domain logic. It should not fetch market data, read/write the database, revalidate routes, start workflows, or call external services.

The catalog may depend on:

- `StrategyState`, `OptionChainSnapshot`, and option-domain types.
- Quote selection helpers that operate on a supplied chain.
- Existing pricing and evaluation helpers where needed.
- Deterministic formatting helpers for strategy labels and saved names.

Market data remains outside the boundary. Callers that need current data should fetch an `OptionChainSnapshot` through the existing provider path and pass the chain into `strategyTemplates.build` or `strategyTemplates.optimizerSeeds`.

This keeps external dependency handling clear:

- **In-process**: template registry, leg specs, strike role mapping, validation, optimizer seeds, summary/naming, capital-at-risk hooks.
- **Local-substitutable**: generated or fixture `OptionChainSnapshot` values used by builder, optimizer, and tests.
- **Mock**: actual provider clients, database persistence, clock/time, cache invalidation, and workflow runtime remain outside this module.

## Testing Strategy

New boundary tests should verify strategy behavior through the catalog:

- Every built-in template appears in `strategyTemplates.all()` and `ids()`.
- Every built-in template can build a valid default `StrategyState` from a generated or fixture chain.
- Role-based strikes and compatibility aliases produce equivalent states for multi-leg strategies.
- `strategyTemplates.validate` rejects invalid leg shape, strike ordering, premium direction, and expiration mismatches.
- `strategyTemplates.optimizerSeeds` returns candidate seeds for each thesis without the optimizer owning strategy-specific tables.
- `strategyTemplates.summarize` returns stable labels, strike labels, expiration labels, and saved names.
- Template-specific capital-at-risk hooks cover covered calls and cash-secured puts.

Old tests to replace or reduce:

- Shallow template-shape coverage in `strategy.test.ts`.
- Builder tests that only prove positional strike wiring for each strategy.
- Optimizer tests that assert hard-coded strategy family tables and candidate input recipes.
- Monitoring tests that only exercise strategy label/name and capital-at-risk exceptions.

Tests that should remain:

- Pricing math tests.
- Payoff/evaluation tests for representative economics.
- Provider normalization tests.
- Integration-style optimizer and watchlist scan tests that assert observable ranked candidates from a supplied chain.

The principle is to replace scattered shallow tests with boundary tests at the template catalog, while preserving math tests where the implementation is genuinely independent.

## Implementation Recommendations

Implement the catalog in small vertical slices.

First, introduce the catalog and migrate metadata-only behavior:

- `BUILDER_STRATEGIES`
- strategy labels
- bias/thesis membership
- scan mode
- optimizer strategy lists

Second, move builder semantics:

- default expiration selection
- option quote selection by role
- positional `strike`/`strike2`/`strike3`/`strike4` alias conversion
- role-based leg materialization

Third, move validation semantics:

- single-leg option shapes
- stock-plus-option shapes
- vertical spread ordering
- straddle/strangle shape
- iron condor ordering

Fourth, move optimizer seed generation:

- candidate strike offsets and ratios
- single-strike versus template-variant scan behavior
- thesis-to-template membership

Fifth, move summary and monitoring hooks:

- saved strategy display names
- strike and expiration summaries
- covered-call and cash-secured-put capital-at-risk exceptions

Keep `StrategyState` as the persisted and evaluated representation. Do not make evaluation depend on template definitions for all payoff math in the first pass. `evaluateStrategy(state)` should remain the payoff engine, with template hooks added only for strategy-specific rules that are already duplicated today, such as breakevens, probability-of-profit classification, and capital-at-risk.

The module should expose a small public surface and keep template internals private. Callers should ask for build, validate, summarize, and optimizer seeds. They should not inspect low-level leg specs unless they are rendering template-selection UI.

The long-term direction is that adding a strategy should require adding one template definition plus catalog boundary tests, not coordinated edits across builder, validator, optimizer, evaluator, monitoring, UI labels, and persistence.
