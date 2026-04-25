# Plan: Options Strategy Builder and Optimizer

> Source PRD: [options-strategy-builder-prd.md](C:/Users/kevin/Documents/dev/options-planner/plans/options-strategy-builder-prd.md)

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: The product has two top-level user routes, `/build` for manual strategy construction and `/optimize` for candidate search and ranking. Shared URLs should restore a full builder strategy state without requiring authentication.
- **URL shape**: The application uses its own canonical serialized strategy format rather than matching OptionStrat's route schema. URL state captures strategy state only, not transient UI preferences.
- **Data source boundary**: Market data is provided through a chain-provider boundary. V1 uses generated plausible US equity option chains, but the consumer contract must remain stable so a real data adapter can replace it later.
- **Key models**: The core domain models are underlying quotes, option-chain snapshots, strategy templates, normalized positions, option legs, stock legs, strategy evaluations, optimization inputs, optimization candidates, and canonical shared strategy state.
- **Analytics boundary**: Pricing, Greeks, payoff generation, breakeven logic, capital usage, and probability-style outputs belong to a dedicated analytics layer that is independent from route and component code.
- **Strategy boundary**: Strategy templates compile user selections into a normalized position model. Covered calls and cash-secured puts remain first-class templates because they have distinct capital and exercise semantics.
- **Optimizer boundary**: The optimizer ranks evaluated candidate strategies on the client side across multiple strategy families using configurable ranking modes and filtering inputs.
- **Product scope**: V1 supports US equity options only, with 100-share contracts, American-style exercise assumptions, and standard weekly/monthly expirations. There is no authentication, server-side saved state, or broker integration.
- **Testing strategy**: The strongest automated coverage should target deep domain behavior first: pricing/evaluation, template compilation, chain generation, optimization, and URL round-tripping. UI tests should stay focused on observable workflows.

---

## Phase 1: Core Engine Skeleton

**User stories**: 17, 21, 22, 23, 35, 36, 37, 38, 40

### What to build

Create the first end-to-end domain backbone for the product without overcommitting the UI. This phase defines the normalized strategy state, the strategy-template contract, the generated sample-chain provider, the pricing/evaluation entry points, and the canonical serialization model used by shared URLs. The result should be a test-backed engine that can evaluate a simple strategy state from generated data and round-trip it through the canonical URL format.

### Acceptance criteria

- A normalized strategy-state model exists that can represent stock legs, option legs, expirations, strikes, premiums, quantity, and long/short direction without route-specific assumptions.
- A chain-provider contract exists and can supply plausible generated chains for a US equity symbol with weekly and monthly expirations.
- A pricing/evaluation boundary exists that can compute deterministic analytics for a representative strategy from normalized inputs.
- Canonical strategy-state serialization and parsing round-trip without loss for supported inputs.
- Automated tests cover strategy validation, generated-chain plausibility, evaluation correctness for representative cases, and URL round-tripping.

---

## Phase 2: Single-Strategy Builder Flow

**User stories**: 1, 2, 3, 4, 8, 10, 11, 12, 13, 16, 18

### What to build

Deliver the first usable `/build` experience as a thin vertical slice. A user can load a symbol, select one initial strategy template, adjust core inputs, view summary analytics, and share or reopen the same state through the canonical URL. The goal is a demoable builder flow that proves the route, URL, domain model, and generated-chain integration work together.

### Acceptance criteria

- The `/build` route loads a desktop-oriented builder experience driven by canonical strategy state.
- A user can choose at least one supported strategy template, edit core inputs, and see the evaluated trade summary update.
- The builder displays basic summary metrics including at least max profit, max loss, breakeven, and capital usage for the selected strategy.
- Loading the same canonical shared URL restores the same builder state and evaluated result.
- Integration tests cover symbol load, strategy selection, editing key inputs, and URL restore behavior.

---

## Phase 3: Payoff Analytics and Greeks in Builder

**User stories**: 5, 6, 7, 9, 21, 22, 23, 32

### What to build

Upgrade the builder into an actual analysis surface. Add payoff visualization and richer strategy analytics so the user can inspect profit and loss across stock-price outcomes and understand sensitivity metrics. This phase should make the model assumptions visible enough that probability-style and Greek outputs feel interpretable rather than magic.

### Acceptance criteria

- The builder includes a payoff chart that updates with strategy-state changes and reflects expiration behavior correctly.
- The builder exposes strategy-level and leg-level Greeks derived from the analytics engine.
- The builder supports at least expiration analysis and leaves room in the model for pre-expiration evaluation.
- Model-derived outputs that depend on assumptions are labeled clearly enough for users to distinguish estimates from guaranteed outcomes.
- Automated tests cover payoff generation and representative Greek calculations for supported strategies.

---

## Phase 4: Expand Builder to Initial Strategy Set

**User stories**: 2, 14, 15, 16, 17, 19, 20

### What to build

Broaden the builder from a single initial strategy into the agreed v1 strategy set: covered call, cash-secured put, long call, long put, bull call spread, and bear put spread. This phase should prove that the template system handles both single-leg and multi-leg strategies, including stock or capital semantics that differ across templates.

### Acceptance criteria

- The builder supports the full initial strategy set from the PRD.
- Covered calls and cash-secured puts are modeled with correct stock or capital assumptions rather than as naive option-only positions.
- Vertical spreads and other multi-leg supported strategies validate legal combinations and reject malformed states.
- Generated chains provide realistic enough strike and expiration choices for the supported strategies.
- Automated tests cover template compilation, validation, and representative analytics for each supported strategy family.

---

## Phase 5: Optimizer Baseline Across Strategy Families

**User stories**: 24, 25, 26, 28, 29, 33, 39

### What to build

Introduce `/optimize` as a client-side exploratory workflow. A user can enter assumptions and constraints, generate candidates across multiple strategy families, and compare the resulting trades in one results view. This slice should already feel useful even before all ranking modes and builder handoff are complete.

### Acceptance criteria

- The `/optimize` route exists and supports client-side input controls for thesis, expiration preferences, and risk-oriented filters.
- The optimizer can generate and evaluate candidates across multiple supported strategy families in one run.
- The results view shows enough summary information to compare trades without opening each one individually.
- Invalid or strategy-incompatible candidates are excluded from results rather than ranked.
- Automated tests cover candidate generation, filtering, and result rendering for representative optimization inputs.

---

## Phase 6: Optimizer Ranking Modes and Builder Handoff

**User stories**: 27, 30, 31, 32, 39

### What to build

Complete the core optimizer workflow by adding the agreed ranking modes and allowing a chosen result to open directly in the builder as a canonical strategy state. This phase connects the exploratory optimization workflow to the deeper builder analysis experience and proves that optimization is built on the same normalized evaluation model.

### Acceptance criteria

- The optimizer supports ranking modes for max profit, max return on capital, downside buffer, target probability of profit, and delta range.
- Ranking behavior is deterministic for fixed assumptions and documented through automated tests.
- A user can open any supported optimizer result in `/build` and land on the matching canonical strategy state.
- The optimizer architecture supports adding more multi-leg candidate generation without replacing the ranking pipeline.
- Integration tests cover ranking changes, candidate ordering, and optimizer-to-builder handoff.

---

## Phase 7: Polish, Trust, and Readiness

**User stories**: 19, 20, 21, 23, 28, 34

### What to build

Harden the product so it feels credible and stable rather than merely functional. This phase focuses on calibration of generated-chain behavior, clarity of modeling assumptions, desktop usability, and confidence-building test coverage around the most sensitive analytics and optimizer paths.

### Acceptance criteria

- Generated chains and evaluation outputs are calibrated enough that representative strategy results look plausible across multiple symbols, strikes, and expirations.
- The desktop layout supports dense comparison and analysis workflows without collapsing into mobile-first compromises.
- Anonymous stateless usage remains intact across builder and optimizer flows, with no hidden dependence on server-side persistence.
- User-facing copy clearly communicates model assumptions where they materially affect interpretation.
- Regression coverage is in place for the highest-risk financial and ranking workflows before broader rollout work begins.