# Options Strategy Visualizer v1 - Implementation Spec

**Status:** Updated to reflect repository state
**Date:** 2026-04-04
**Type:** Feature plan
**Effort:** XL
**Approved input:** `specs/options-strategy-visualizer-v1-functional-parity-prd.md`

## Problem Statement

### Who

The primary user is a self-directed options trader who wants a focused educational tool for modeling, comparing, and revisiting common options strategies.

### What

The user needs a fast workflow that starts from an optimizer-driven thesis, produces ranked candidate strategies, and then opens any chosen candidate in a dedicated builder where legs, expiries, strikes, quantities, and assumptions can be tuned freely before saving it for later review.

### Why it matters

Without this product, the user either works in tooling that is too shallow for time-dependent scenario analysis or too broad and account-centric for focused strategy research. A narrower, deterministic product also gives us a tractable first release and a stable platform for later provider expansion.

### Evidence

- `deep-research-report.md` fixes the v1 boundaries and required modeling features.
- The approved comparison PRD locks Vercel + PostgreSQL, daily snapshots, bounded optimizer scope, and functional parity as the UX target.
- The current repository is no longer greenfield. Core provider, analytics, and optimizer foundations exist, so the main risk has shifted from greenfield setup to spec drift and incomplete product surface integration.

## Proposed Solution

Build a full-stack Next.js App Router application deployed primarily on Vercel and backed by PostgreSQL. The application should open on the optimizer by default, treat the builder as the primary deep-analysis workspace, and keep saved strategies plus settings as supporting areas. There is no dedicated home/search page or standalone strategy-library page in v1; symbol search and strategy-template selection are embedded inside the optimizer and builder flows. Route Handlers provide the backend API surface, while client-heavy components power the builder, analytics views, and optimizer interactions.

The target interaction model is:

- land on the optimizer and enter the user's thesis there
- review ranked candidate strategies
- open any candidate in a builder workspace
- adjust the specific structure with direct controls for expiries, strikes, legs, and assumptions
- save or reopen strategies from persisted history

All market-data access flows through a provider abstraction. v1 ships only with a deterministic `MockProvider`, which supplies symbols, expiries, option chains, greeks, and quote data for development, CI, and end-to-end testing. The builder, optimizer, and saved-strategy snapshot job all depend on the same pricing and analytics engine so the product yields consistent modeled outputs everywhere.

The implementation should be organized as a small set of stable modules rather than page-bound logic:

- `src/modules/market/` for market-data schemas, provider interfaces, and the mock provider
- `src/modules/strategies/` for strategy types, templates, validators, analytics, and calculation use cases
- `src/modules/optimizer/` for optimizer schemas, ranking logic, and orchestration
- `src/db/` for schema, repository logic, and migrations
- `src/components/` for reusable UI building blocks
- `src/app/` for routes, layouts, and Route Handlers

## Scope and Deliverables

| Deliverable | Effort | Depends On | Status |
|-------------|--------|------------|--------|
| D1. Foundation and schema baseline | L | - | Complete |
| D2. Provider abstraction and mock market API | L | D1 | Complete |
| D3. Strategy templates, builder state, and handoff contract | L | D2 | In progress |
| D4. Pricing, analytics, and visualization contract | XL | D2, D3 | In progress |
| D5. Optimizer engine and optimizer-first entry flow | L | D4 | In progress |
| D6. Builder workspace UI | L | D3, D4, D5 | Not started |
| D7. Saved strategies, settings, and daily snapshots | L | D1, D4, D6 | Not started |
| D8. Test coverage, docs, and deployment readiness | L | D1-D7 | In progress |

## Deliverable Details

### D1. Foundation and schema baseline

**Status:** Complete.

- Initialize Next.js App Router project with strict TypeScript, linting, formatting, and test runners.
- Establish PostgreSQL schema and migrations for instruments, option contracts, strategy templates, saved strategies, saved strategy legs, saved snapshots, and app settings.
- Create shared domain types and Zod schemas for all write payloads.

### D2. Provider abstraction and mock market API

**Status:** Complete.

- Define provider interfaces for symbol search, quote lookup, expirations, and chain retrieval.
- Implement deterministic `MockProvider` backed by versioned repository data.
- Expose market Route Handlers that translate provider results into stable API contracts.

**Implemented:** `MarketDataProvider` in `src/modules/market/`, deterministic `MockMarketDataProvider` with Zod-validated `mock-data.json` (version field), and Route Handlers `GET /api/market/symbols`, `GET /api/market/quote`, `GET /api/options/expirations`, `GET /api/options/chain` with shared Zod query validation and `{ data }` / structured error responses. Vitest coverage exists for the mock provider and the four market routes.

### D3. Strategy templates, builder state, and handoff contract

**Status:** In progress.

- Seed the approved v1 strategy template catalog using exact names.
- Define the builder-state shape used by templates, optimizer results, and future saved-strategy reopen flows.
- Implement the shared handoff contract between optimizer results and the builder workspace.
- Embed template selection into builder and optimizer flows.

**Implemented:** Canonical v1 template list with exact PRD strategy names and `legsSpec` in `src/modules/strategies/catalog.ts`, `GET /api/strategies/templates` returning `{ data }`, strict builder-state and calc schemas in `src/modules/strategies/schemas.ts`, and optimizer candidates returning a full `builderState` handoff payload.

**Remaining:** Database seeding of `strategy_template` rows, dedicated builder route, template loading UI, leg editing UI, assumptions controls UI, and builder view-state management.

### D4. Pricing, analytics, and visualization contract

**Status:** In progress.

- Implement pricing services for European and American-style scenario valuation.
- Produce summary metrics, profit and loss grids, chart series, breakevens, greeks, and chance-of-profit outputs.
- Wire builder edits to immediate recalculation and stable API responses.

**Implemented:** `POST /api/strategies/calc`, shared strategy analytics and scenario valuation logic in `src/modules/strategies/analytics.ts`, quote-and-chain hydration via the market provider, summary metrics, breakevens, net greeks, profit grid output, chart series output, implied-move bands, and chance-of-profit calculations. Unit and route tests cover the current calc path.

**Remaining:** Builder-facing interactive recalculation loop, final builder visualization contract in the actual UI, and any pricing-model refinements needed once more strategies and controls are exposed.

### D5. Optimizer engine and optimizer-first entry flow

**Status:** In progress.

- Implement bounded candidate generation over the approved strategy subset.
- Support ranking by maximum expected profit or maximum modeled chance of profit.
- Build the optimizer as the default landing screen and implement the one-click builder handoff flow for any candidate.

**Implemented:** `POST /api/optimizer/run`, bounded deterministic optimizer logic in `src/modules/optimizer/`, symbol-first optimizer UI as the current app entry experience, optimizer cards hydrated with analytics detail, and route plus engine tests.

**Remaining:** Expand optimizer inputs beyond `symbol` to the approved thesis fields, expose ranking and constraint controls in the UI, generate the full approved strategy subset rather than the currently implemented subset, and add one-click builder handoff for each candidate.

### D6. Builder workspace UI

**Status:** Not started.

- Build the dedicated builder route and workspace shell.
- Support in-flow template browsing and loading without a standalone strategy-library page.
- Support direct leg edits, expiration and strike changes, quantity changes, and assumptions updates.
- Show the compact control strip, summary cards, chart output, grid output, and net greeks in one workspace.
- Recalculate immediately on builder edits without a manual submit step.

**Why this is next:** The repository already has the calc API, analytics engine, template catalog, and optimizer handoff payload needed to support a first builder vertical slice. This is now the highest-leverage missing user surface.

### D7. Saved strategies, settings, and daily snapshots

**Status:** Not started.

- Persist builder state and normalized legs.
- Implement save, list, rename, reopen, close, and snapshot flows.
- Add scheduled daily snapshot processing for open strategies.
- Implement settings persistence for commissions, defaults, IV behavior, and risk-free rate.
- Ensure all write routes validate input, reject unknown keys, and return structured errors.
- Keep provider access server-side only and document environment configuration.

**Implemented foundation:** Database schema exists for saved strategies, saved legs, saved snapshots, and app settings. Current write routes for calc and optimizer already validate payloads and return structured errors.

**Remaining:** Repositories, route handlers, scheduled snapshot processing, reopen semantics, and user-facing settings flows.

### D8. Test coverage, docs, and deployment readiness

**Status:** In progress.

- Add unit coverage around pricing, chance-of-profit, strategy construction, and optimizer ranking.
- Add integration coverage around routes, persistence, and scheduled jobs.
- Add Playwright coverage for the highest-value end-to-end flows in mock mode.
- Write setup, architecture, pricing, mock data, and Vercel operations docs.

**Implemented:** Vitest coverage exists for market routes, template routes, calc routes, optimizer routes, mock provider behavior, pricing analytics, and optimizer ranking.

**Remaining:** Persistence-route integration coverage, scheduled-job coverage, end-to-end UI coverage, and project docs beyond the current planning/spec artifacts.

## Non-Goals

- Authentication, accounts, subscriptions, or billing
- Share links or public read-only strategy pages
- Unusual options flow
- Brokerage integration or live order execution
- Dividend modeling or ex-dividend handling
- Futures options
- Partial closes
- A dedicated cache layer in v1
- Shipping a real market-data adapter in v1

## Discovery Summary

### Explored

- `deep-research-report.md`
- existing `PRD.md`
- approved comparison PRD at `specs/options-strategy-visualizer-v1-functional-parity-prd.md`
- current application code under `src/app/`, `src/modules/`, and `src/components/`

### Key findings

- The repository now contains implemented application foundations, not planning documents only.
- Product decisions that materially affect implementation remain fixed: Vercel-first deployment, PostgreSQL, daily snapshots, bounded optimizer, and functional rather than pixel-level parity.
- The intended entry flow remains optimizer first with embedded discovery inside the optimizer and builder.
- The largest remaining build risks are builder integration, pricing correctness under broader strategy coverage, and keeping optimizer scope bounded while making it useful.

## Data Model

### Core persisted entities

| Entity | Purpose | Key fields |
|--------|---------|------------|
| `instrument` | Underlying reference data | `id`, `symbol`, `name`, `asset_type`, `currency`, `exchange`, `created_at` |
| `option_contract` | Canonical option definitions | `id`, `instrument_id`, `expiry`, `strike`, `right`, `exercise_style`, `contract_symbol`, `multiplier` |
| `strategy_template` | Seeded strategy definitions | `id`, `name`, `description`, `legs_spec`, `created_at` |
| `saved_strategy` | Persisted builder state | `id`, `instrument_id`, `template_id`, `name`, `status`, `entry_ts`, `close_ts`, `builder_state`, `created_at`, `updated_at` |
| `saved_strategy_leg` | Normalized saved legs | `id`, `saved_strategy_id`, `kind`, `side`, `qty`, `option_contract_id`, `entry_price`, `close_price` |
| `saved_strategy_snapshot` | Daily mark-to-market history | `id`, `saved_strategy_id`, `ts`, `net_value`, `unrealized_pnl`, `realized_pnl` |
| `app_settings` | Single-user defaults | `id`, `commissions`, `defaults`, `provider_config`, `updated_at` |

### Key application shapes

```ts
type BuilderLeg = {
  kind: "option" | "stock";
  side: "buy" | "sell";
  qty: number;
  right?: "C" | "P";
  strike?: number;
  expiry?: string;
  entryPriceMode: "bid" | "ask" | "mark" | "mid" | "manual";
  manualEntryPrice?: number;
};

type BuilderState = {
  symbol: string;
  templateName?: string;
  horizonDays: number;
  riskFreeRate: number;
  commissions: { perContract: number; perLegFee: number };
  ivOverrides: { global?: number; byExpiry: Record<string, number> };
  grid: { pricePoints: number; datePoints: number; priceRangePct: number };
  legs: BuilderLeg[];
};

type CalcResponse = {
  summary: {
    netDebitOrCredit: number;
    maxProfit: number | null;
    maxLoss: number | null;
    breakevens: number[];
    chanceOfProfitAtHorizon: number;
    chanceOfProfitAtExpiration: number;
    netGreeks: { delta: number; gamma: number; theta: number; vega: number; rho: number };
  };
  grid: {
    prices: number[];
    dates: string[];
    values: number[][];
  };
  chart: {
    selectedDate: string;
    series: Array<{ price: number; pnl: number }>;
    impliedMove1x: { down: number; up: number };
    impliedMove2x: { down: number; up: number };
  };
};
```

### Persistence rules

- Use `numeric` for monetary values.
- Use `timestamptz` for persisted timestamps.
- Reject floating-point persistence for money.
- Persist both normalized legs and raw builder state for reopen fidelity plus reporting flexibility.

## API and Interface Contract

### Route Handlers

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/market/symbols?q=` | `GET` | Search supported symbols |
| `/api/market/quote?symbol=` | `GET` | Return underlying quote |
| `/api/options/expirations?symbol=` | `GET` | Return expiries for a symbol |
| `/api/options/chain?symbol=&expiry=` | `GET` | Return option chain for symbol and expiry |
| `/api/strategies/templates` | `GET` | Return seeded v1 strategy templates |
| `/api/strategies/calc` | `POST` | Calculate builder analytics |
| `/api/optimizer/run` | `POST` | Run bounded optimizer search |
| `/api/saved` | `GET`, `POST` | List or create saved strategies |
| `/api/saved/{id}` | `GET`, `PUT` | Load or update a saved strategy |
| `/api/saved/{id}/close` | `POST` | Close a full strategy |
| `/api/saved/{id}/snapshot` | `POST` | Create snapshot for a strategy |
| `/api/settings` | `GET`, `PUT` | Read and update defaults |

### Write-route requirements

- Validate body payloads with Zod.
- Reject unknown keys.
- Return structured error payloads with stable error codes.
- Keep route handlers thin by delegating business work to `src/modules/` and persistence work to `src/db/`.

### Provider interface

```ts
interface MarketDataProvider {
  searchSymbols(query: string): Promise<SymbolSearchResult[]>;
  getQuote(symbol: string): Promise<UnderlyingQuote>;
  getExpirations(symbol: string): Promise<string[]>;
  getChain(symbol: string, expiry: string): Promise<OptionChain>;
}
```

### Optimizer contract

- Inputs: symbol, target price, target date or expiry window, ranking objective, max loss, max legs, strike window.
- Output: ranked candidate list with strategy name, leg summary, entry debit or credit, max profit, max loss, breakevens, chance-of-profit values, expected profit at target, and builder handoff payload.
- Search scope: only the approved v1 strategy set.

### Route and navigation expectations

- `/` should redirect to the optimizer route rather than render a dedicated landing page in the final v1 structure.
- The optimizer route should own symbol search and initial thesis capture.
- The builder route should accept optimizer handoff payloads and also support direct loading from saved strategies or explicit template selection.
- Template browsing should exist as an in-flow selector, modal, or side panel rather than a standalone page.

**Current implementation note:** The repository currently renders the optimizer experience directly on `/`. That is acceptable as an interim implementation, but v1 should either formalize `/` as the optimizer route or add an explicit redirect to a dedicated optimizer route before the spec is considered complete.

## Acceptance Criteria

- [x] The default app entry point opens on the optimizer rather than a dedicated home/search screen.
- [ ] The optimizer can search/select a symbol, collect the full thesis inputs, and produce ranked candidates in one flow.
- [ ] Any optimizer result can open in the builder with all required handoff state loaded.
- [ ] Builder template selection is available in-flow without requiring a standalone strategy-library page.
- [ ] Builder supports leg edits, assumption controls, and immediate recalculation without manual submit.
- [ ] Builder exposes summary cards, grid output, chart output, and net greeks.
- [ ] Builder shows chance of profit at the selected horizon and at expiration.
- [ ] Builder supports an OptionStrat-style editing workflow with direct expiration, strike, and position adjustments for a selected strategy.
- [ ] Optimizer runs a bounded deterministic search over the approved v1 subset and opens results in the builder.
- [ ] Saved strategies can be created, renamed, reopened, closed, and snapshotted.
- [ ] Daily snapshot processing records mark-to-market history for open strategies only.
- [ ] Settings defaults persist and influence calculations when explicit overrides are absent.
- [ ] The full product works in deterministic mock mode with no external API keys.
- [x] Core implemented write routes reject invalid payloads and unknown fields.
- [ ] Product docs cover setup, architecture, pricing assumptions, mock data, and Vercel operations.

## Test Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | Pricing formulas, greeks aggregation, breakevens, chance-of-profit, template builders, optimizer ranking | Deterministic fixtures and numeric assertions; Vitest coverage exists for analytics and optimizer modules |
| Integration | Route handlers, repositories, settings flows, save/close/snapshot flows | Test database plus mock provider; Vitest currently covers market, templates, calc, and optimizer handlers, while DB-backed flows are not yet covered |
| E2E | Optimizer-first workflow, builder workflow, save and reopen flow, close flow | Playwright against mock mode |
| Scheduled jobs | Daily snapshot processing for open strategies | Job runner tests with seeded open and closed strategies |

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Pricing implementation drift across builder, optimizer, and snapshots | Medium | High | Centralize valuation logic inside `src/modules/strategies/` and reuse the same service interfaces everywhere |
| Analytics grid performance degrades on large defaults | Medium | High | Start with bounded default grids, measure recomputation time, and degrade gracefully before expanding defaults |
| Mock data is insufficiently realistic for UX and test confidence | Medium | Medium | Version the dataset and generate it from a script with representative symbols, expiries, spreads, and IV shapes |
| Scope expansion toward full OptionStrat coverage | High | High | Keep the approved strategy set and non-goals explicit in docs, UI copy, and task breakdown |
| Optimizer-to-builder handoff becomes lossy or ambiguous | Medium | High | Define a single typed handoff payload and use it for optimizer results, template loading, and saved-strategy reopen flows |
| Spec drift obscures actual implementation status and next steps | Medium | Medium | Keep deliverable statuses and acceptance criteria updated as backend and UI milestones land |
| Saved strategy semantics become ambiguous after settings changes | Medium | Medium | Persist full builder state on save and define reload behavior explicitly in repository and API contracts |

## Trade-Offs Made

| Chose | Over | Because |
|-------|------|---------|
| PostgreSQL from day one | Local-first split persistence | It matches the deployment target and avoids maintaining two schemas |
| Mock provider only in v1 | Real vendor adapter in first release | Deterministic delivery and testing matter more than live data early |
| Bounded optimizer | Open-ended catalog search | Predictability, performance, and QA are more important than breadth |
| Daily snapshots | Intraday tracking | Daily history is enough for v1 and cheaper operationally |
| Functional parity | Pixel-perfect clone fidelity | The product needs to replicate jobs to be done, not another product's exact presentation |

## Open Questions

- [ ] Which underlyings should seed the initial mock dataset? -> Owner: product
- [ ] Should reopening a saved strategy preserve historical defaults exactly or merge in newly changed global defaults? -> Owner: product and engineering
- [ ] What default grid sizes should be considered the standard "responsive" target on a developer laptop? -> Owner: engineering
- [ ] Should the builder expose template switching as a modal, drawer, or inline side panel once a strategy is already open? -> Owner: product and engineering
- [ ] Should `/` remain the canonical optimizer route in v1, or should the app introduce a distinct `/optimizer` route and redirect? -> Owner: product and engineering

## Success Metrics

- Builder recalculation remains responsive for the default grid in mock mode on a typical developer laptop.
- All approved v1 strategy templates can be loaded, edited, and analyzed without unsupported states.
- Optimizer results are deterministic for the same inputs in mock mode.
- Save, reopen, close, and daily snapshot workflows pass integration and end-to-end coverage.
- The application can be deployed to Vercel with PostgreSQL and run without external market-data credentials.

## Recommendation

Proceed with the remaining work as vertical slices rather than strict numeric-order execution:

1. Complete the optimizer-to-builder handoff contract in the UI.
2. Build the first dedicated builder workspace on top of the existing calc API and analytics engine.
3. Expand optimizer thesis inputs and candidate generation to the approved v1 subset.
4. Add persistence, settings, and daily snapshots.
5. Finish integration, end-to-end coverage, and operational docs.

This preserves the original product priorities while matching the repository's actual state: provider, analytics, and a first optimizer surface already exist, so the next highest-value milestone is the builder workspace rather than more planning around backend foundations.
