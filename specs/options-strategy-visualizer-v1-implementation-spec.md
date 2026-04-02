# Options Strategy Visualizer v1 - Implementation Spec

**Status:** Ready for review
**Date:** 2026-03-27
**Type:** Feature plan
**Effort:** XL
**Approved input:** `specs/options-strategy-visualizer-v1-functional-parity-prd.md`

## Problem Statement

### Who

The primary user is a self-directed options trader who wants a focused educational tool for modeling, comparing, and revisiting common options strategies.

### What

The user needs a fast workflow to search for an underlying, load a known strategy structure, adjust legs and assumptions, inspect payoff and risk over time, compare candidate structures against a thesis, and save strategies for later review.

### Why it matters

Without this product, the user either works in tooling that is too shallow for time-dependent scenario analysis or too broad and account-centric for focused strategy research. A narrower, deterministic product also gives us a tractable first release and a stable platform for later provider expansion.

### Evidence

- `deep-research-report.md` fixes the v1 boundaries and required modeling features.
- The approved comparison PRD locks Vercel + PostgreSQL, daily snapshots, bounded optimizer scope, and functional parity as the UX target.
- The current repository is greenfield from an application standpoint, so the main risk is specification drift rather than migration complexity.

## Proposed Solution

Build a full-stack Next.js App Router application deployed primarily on Vercel and backed by PostgreSQL. The application exposes six product areas: Home/Search, Strategy Builder, Strategy Library, Optimizer, Saved Strategies, and Settings. Route Handlers provide the backend API surface, while client-heavy components power the builder, analytics views, and optimizer interactions.

All market-data access flows through a provider abstraction. v1 ships only with a deterministic `MockProvider`, which supplies symbols, expiries, option chains, greeks, and quote data for development, CI, and end-to-end testing. The builder, optimizer, and saved-strategy snapshot job all depend on the same pricing and analytics engine so the product yields consistent modeled outputs everywhere.

The implementation should be organized as a small set of stable modules rather than page-bound logic:

- `src/modules/market/` for market-data schemas, provider interfaces, and the mock provider
- `src/modules/strategies/` for strategy types, templates, validators, analytics, and calculation use cases
- `src/modules/optimizer/` for optimizer schemas, ranking logic, and orchestration
- `src/db/` for schema, repository logic, and migrations
- `src/components/` for reusable UI building blocks
- `app/` for routes, layouts, and Route Handlers

## Scope and Deliverables

| Deliverable | Effort | Depends On | Status |
|-------------|--------|------------|--------|
| D1. Foundation and schema baseline | L | - | Complete |
| D2. Provider abstraction and mock market API | L | D1 | Complete |
| D3. Strategy catalog and builder shell | L | D2 | In progress |
| D4. Pricing, analytics, and visualization contract | XL | D2, D3 | |
| D5. Optimizer engine and UI flow | L | D4 | |
| D6. Saved strategies and daily snapshots | L | D1, D4 | |
| D7. Settings, validation, and operational hardening | M | D1, D2, D6 | |
| D8. Test coverage, docs, and deployment readiness | L | D1-D7 | |

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

**Implemented:** `MarketDataProvider` in `src/modules/market/`, deterministic `MockMarketDataProvider` with Zod-validated `mock-data.json` (version field), and Route Handlers `GET /api/market/symbols`, `GET /api/market/quote`, `GET /api/options/expirations`, `GET /api/options/chain` with shared Zod query validation and `{ data }` / structured error responses. Vitest coverage for the mock provider and for the four market routes.

### D3. Strategy catalog and builder shell

**Status:** In progress.

- Seed the approved v1 strategy template catalog using exact names.
- Build Home/Search, Strategy Library, and the first-pass Strategy Builder shell.
- Implement leg editing, assumption controls, template loading, and view state management.

**Implemented:** Canonical v1 template list with exact PRD strategy names and `legsSpec` in `src/modules/strategies/catalog.ts`, and `GET /api/strategies/templates` returning `{ data }`. Vitest coverage for that route. Database seeding of `strategy_template` rows is not done yet.

**Not started:** Home/Search, Strategy Library and builder UI routes, leg editing, assumptions, client template loading, and builder view state.

### D4. Pricing, analytics, and visualization contract

- Implement pricing services for European and American-style scenario valuation.
- Produce summary metrics, profit and loss grids, chart series, breakevens, greeks, and chance-of-profit outputs.
- Wire builder edits to immediate recalculation and stable API responses.

### D5. Optimizer engine and UI flow

- Implement bounded candidate generation over the approved strategy subset.
- Support ranking by maximum expected profit or maximum modeled chance of profit.
- Build the optimizer screen and builder handoff flow.

### D6. Saved strategies and daily snapshots

- Persist builder state and normalized legs.
- Implement save, list, rename, reopen, close, and snapshot flows.
- Add scheduled daily snapshot processing for open strategies.

### D7. Settings, validation, and operational hardening

- Implement settings persistence for commissions, defaults, IV behavior, and risk-free rate.
- Ensure all write routes validate input, reject unknown keys, and return structured errors.
- Keep provider access server-side only and document environment configuration.

### D8. Test coverage, docs, and deployment readiness

- Add unit coverage around pricing, chance-of-profit, strategy construction, and optimizer ranking.
- Add integration coverage around routes, persistence, and scheduled jobs.
- Add Playwright coverage for the highest-value end-to-end flows in mock mode.
- Write setup, architecture, pricing, mock data, and Vercel operations docs.

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

### Key findings

- The repository contains planning documents only; there is no existing application architecture to preserve.
- Product decisions that materially affect implementation are already fixed: Vercel-first deployment, PostgreSQL, daily snapshots, bounded optimizer, and functional rather than pixel-level parity.
- The largest build risks are pricing correctness, responsive analytics performance, and keeping product scope bounded.

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

## Acceptance Criteria

- [ ] Home/Search can select a symbol and route into the builder with that symbol loaded.
- [ ] Strategy Library lists all approved v1 templates using exact names and opens them in the builder.
- [ ] Builder supports leg edits, assumption controls, and immediate recalculation without manual submit.
- [ ] Builder exposes summary cards, grid output, chart output, and net greeks.
- [ ] Builder shows chance of profit at the selected horizon and at expiration.
- [ ] Optimizer runs a bounded deterministic search and opens results in the builder.
- [ ] Saved strategies can be created, renamed, reopened, closed, and snapshotted.
- [ ] Daily snapshot processing records mark-to-market history for open strategies only.
- [ ] Settings defaults persist and influence calculations when explicit overrides are absent.
- [ ] The full product works in deterministic mock mode with no external API keys.
- [ ] Core write routes reject invalid payloads and unknown fields.
- [ ] Product docs cover setup, architecture, pricing assumptions, mock data, and Vercel operations.

## Test Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | Pricing formulas, greeks aggregation, breakevens, chance-of-profit, template builders, optimizer ranking | Deterministic fixtures and numeric assertions |
| Integration | Route handlers, repositories, settings flows, save/close/snapshot flows | Test database plus mock provider; Vitest covers read-only market and templates handlers with mock provider (DB-backed flows not yet) |
| E2E | Builder workflow, optimizer workflow, save and reopen flow, close flow | Playwright against mock mode |
| Scheduled jobs | Daily snapshot processing for open strategies | Job runner tests with seeded open and closed strategies |

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Pricing implementation drift across builder, optimizer, and snapshots | Medium | High | Centralize valuation logic inside `src/modules/strategies/` and reuse the same service interfaces everywhere |
| Analytics grid performance degrades on large defaults | Medium | High | Start with bounded default grids, measure recomputation time, and degrade gracefully before expanding defaults |
| Mock data is insufficiently realistic for UX and test confidence | Medium | Medium | Version the dataset and generate it from a script with representative symbols, expiries, spreads, and IV shapes |
| Scope expansion toward full OptionStrat coverage | High | High | Keep the approved strategy set and non-goals explicit in docs, UI copy, and task breakdown |
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

## Success Metrics

- Builder recalculation remains responsive for the default grid in mock mode on a typical developer laptop.
- All approved v1 strategy templates can be loaded, edited, and analyzed without unsupported states.
- Optimizer results are deterministic for the same inputs in mock mode.
- Save, reopen, close, and daily snapshot workflows pass integration and end-to-end coverage.
- The application can be deployed to Vercel with PostgreSQL and run without external market-data credentials.

## Recommendation

Proceed with D1 through D8 in order, but execute D2 and D4 with extra rigor because provider and pricing correctness are the highest-risk foundations. Once this spec is approved, the next artifact should be a task breakdown organized as vertical slices rather than layer-first infrastructure work.
