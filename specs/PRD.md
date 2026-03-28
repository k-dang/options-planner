## Problem Statement

Individual options traders who want to explore, compare, and track common options strategies often need a fast visual tool for modeling future profit and loss, understanding tradeoffs, and revisiting saved ideas over time. Existing products can be broad, complex, or coupled to brokerage and account workflows that are unnecessary for a single-user educational tool.

This product solves that by providing a single-user options strategy visualizer focused on the core builder and optimizer experience. The user needs to be able to choose an underlying, load a supported strategy template, edit legs and pricing assumptions, see immediate recalculation across future dates and prices, compare candidate strategies against a target thesis, and save strategies for later mark-to-market review. The product must clearly communicate that all valuations are model-based estimates and not trading advice.

## Solution

Build a full-stack Next.js application for a single-user deployment with no authentication, no billing, and no account system. The product includes six primary areas: Home/Search, Strategy Builder, Strategy Library, Optimizer, Saved Strategies, and Settings.

The Strategy Builder is the center of the experience. It lets the user search for a symbol, load a supported strategy template, edit legs, adjust implied volatility, commissions, valuation horizon, and risk-free rate, and immediately view recalculated analytics in table, chart, and greeks views. The Strategy Library exposes a curated subset of exact OptionStrat strategy names. The Optimizer searches that same bounded subset and ranks candidates according to a clear objective. Saved Strategies persists builder state locally and records mark-to-market snapshots over time. All market data access is routed through a provider abstraction, with a deterministic mock provider as the only shipped provider in v1.

## User Stories

1. As a self-directed options trader, I want to search for an underlying symbol from the home screen, so that I can start analysis quickly.
2. As a first-time visitor, I want the product to explain that it is educational and model-driven, so that I understand its limitations before using it.
3. As a user, I want quick navigation from the home screen into Builder, Library, Optimizer, Saved Strategies, and Settings, so that I can move directly into the workflow I need.
4. As a user, I want to open the Strategy Builder with a selected underlying, so that my analysis starts from a specific instrument.
5. As a user, I want to load a strategy template into the builder, so that I can begin from a common options structure instead of assembling every leg manually.
6. As a user, I want the strategy library to use exact OptionStrat strategy names for the approved v1 subset, so that the strategy vocabulary matches what I already know.
7. As a user, I want each library item to include a short description and leg pattern summary, so that I can distinguish similar strategies before opening one.
8. As a user, I want to edit option legs directly in the builder, so that I can customize a template to match my thesis.
9. As a user, I want to change strikes, expiries, sides, and quantities, so that I can test variations of a strategy structure.
10. As a user, I want to choose how entry price is sourced, including bid, ask, mark, mid, or manual entry, so that I can model fills more realistically.
11. As a user, I want to adjust valuation horizon in days, so that I can inspect time-dependent behavior before expiration.
12. As a user, I want to override implied volatility globally, so that I can stress-test the entire strategy under different volatility assumptions.
13. As a user, I want to override implied volatility by expiry, so that I can model term-structure differences more precisely.
14. As a user, I want to change the risk-free rate or use a default setting, so that my pricing assumptions remain explicit and controllable.
15. As a user, I want to configure commissions, so that strategy profitability reflects transaction costs.
16. As a user, I want the builder to recalculate immediately after edits, so that exploration feels interactive rather than batch-oriented.
17. As a user, I want a profit and loss table with rows for underlying prices and columns for future dates, so that I can inspect outcomes across both price and time.
18. As a user, I want to toggle the table display between dollars, percent change, percent of risk, and contract value, so that I can view results in the format most useful to me.
19. As a user, I want chart-range and price-range controls, so that I can focus the analysis on the part of the distribution I care about.
20. As a user, I want a chart for a selected date slice, so that I can inspect the payoff shape on a single horizon.
21. As a user, I want exact profit and loss values on hover in the chart, so that I can read precise outcomes without approximating from the curve.
22. As a user, I want breakeven lines shown visually, so that I can understand where the trade transitions from loss to profit.
23. As a user, I want probability distribution overlays and implied move markers, so that I can compare payoff shape against modeled price ranges.
24. As a user, I want the chart to show plus and minus 1x and 2x implied move guides, so that I can quickly frame realistic price scenarios.
25. As a user, I want summary cards for net debit or credit, max profit, max loss, breakevens, and net greeks, so that I can evaluate a strategy at a glance.
26. As a user, I want chance of profit at the selected horizon and at expiration, so that I can compare short-term and expiry-based expectations.
27. As a user, I want a greeks view that aggregates delta, gamma, theta, vega, and rho, so that I can understand directional and sensitivity exposure.
28. As a mobile user, I want the builder to work in a stacked single-column layout with collapsible controls, so that the product is usable on smaller screens.
29. As a keyboard user, I want critical interactions to be accessible without a mouse, so that the application remains usable and compliant with basic accessibility expectations.
30. As a user, I want an optimizer where I can specify symbol, thesis, target price, target date or expiration window, objective, and constraints, so that the system can surface candidate trades consistent with my goal.
31. As a user, I want optimizer objectives to be explicit, so that I understand whether results are ranked by expected profit or chance of profit.
32. As a user, I want optimizer constraints such as max loss, max legs, and strike window, so that suggested strategies remain within acceptable risk and complexity bounds.
33. As a user, I want optimizer results to show key summary metrics and leg summaries, so that I can compare candidates without opening each one individually.
34. As a user, I want to open any optimizer result directly in the builder, so that I can continue editing and analyzing a recommended structure.
35. As a user, I want to save the current strategy locally, so that I can revisit it later without rebuilding it manually.
36. As a user, I want to rename saved strategies, so that my saved list remains understandable over time.
37. As a user, I want to reopen a saved strategy in the builder, so that I can continue analysis from where I left off.
38. As a user, I want to see historical mark-to-market snapshots for open strategies, so that I can track how modeled value changed over time.
39. As a user, I want saved strategies to show realized or unrealized profit and loss depending on status, so that I can distinguish open versus closed outcomes.
40. As a user, I want to close an entire saved strategy in one action, so that the system reflects the v1 rule that strategies are either fully open or fully closed.
41. As a user, I want strategy closing to store exit prices and close timestamps, so that realized profit and loss can be computed consistently.
42. As a user, I want settings for commission defaults, default grid behavior, implied volatility override behavior, and default risk-free rate, so that the app matches my preferred modeling defaults.
43. As a user, I want provider diagnostics in settings, so that I can confirm the app is running in the intended data mode.
44. As a developer or tester, I want the application to run entirely against a deterministic mock provider, so that local development, CI, and end-to-end tests are stable.
45. As a future maintainer, I want market data access hidden behind a provider interface, so that a real vendor can be added later without rewriting product workflows.
46. As a user, I want the system to clearly reject invalid write requests, so that data integrity is preserved even in a single-user deployment.
47. As a user, I want saved strategy data and settings to persist across sessions for the running instance, so that the product behaves like a durable local application rather than a temporary demo.
48. As a user, I want the product to exclude unrelated complexity such as account systems, social sharing, and unusual flow analysis, so that the experience stays focused on strategy visualization and optimization.

## Implementation Decisions

- The product is a single-user full-stack Next.js application with App Router, Route Handlers, and a Vercel-first deployment path.
- The scope is intentionally limited to educational strategy modeling and excludes authentication, billing, brokerage integration, and public sharing.
- The strategy universe for v1 is fixed to this subset: Long Call, Long Put, Short Call, Short Put, Bull Call Spread, Bear Put Spread, Bull Put Spread, Bear Call Spread, Iron Condor, Long Straddle, Long Strangle, Covered Call, and Cash-Secured Put.
- The Strategy Builder is the primary product surface and must support immediate recalculation after edits to legs or assumptions.
- Builder analytics are split into table, chart, and greeks views, with summary metrics presented separately for fast interpretation.
- Time-dependent valuation is required; the system must value strategies across future dates before expiration rather than only at expiry payoff.
- Pricing uses Black-Scholes-Merton for European-style scenario valuation and a Bjerksund-Stensland style approximation for American-style options.
- Chance-of-profit calculations are modeled under a lognormal distribution assumption and must be shown both at the selected horizon and at expiration.
- Commissions are part of profitability calculations and must be included when determining whether profit and loss is positive.
- The optimizer searches only the approved v1 strategy subset and ranks candidates by one of two explicit objectives: maximum expected profit at the user-selected target or maximum modeled chance of profit.
- Optimizer candidate generation must remain bounded and deterministic in mock mode rather than trying to cover the full long-tail strategy catalog.
- Saved strategies persist both normalized legs and full builder-state snapshots so the system can support analytics, reopening, and future migration flexibility.
- Saved strategy lifecycle is binary in v1: a strategy is either open or closed. Partial closes are not supported.
- Mark-to-market tracking is implemented as scheduled snapshots for open strategies, storing current net value and unrealized profit and loss history.
- All market-data access is routed through a provider abstraction layer. The only shipped provider in v1 is a deterministic mock provider with versioned seed data.
- The mock provider must include at least three underlyings, four expiries per underlying, and stable quotes, implied volatility, open interest, volume, and greeks for reproducible testing.
- The architecture is intentionally vendor-agnostic, but no real vendor adapter is included in v1.
- The product uses a relational database with migration-based schema management. Monetary values use exact numeric storage rather than floating-point persistence.
- Core product modules include market data provider interfaces, strategy template catalog, pricing and analytics engine, optimizer engine, saved-strategy persistence, settings management, and scheduled snapshot processing.
- Route handlers should stay thin, with domain logic centralized in deeper modules that expose stable, testable interfaces.
- Write endpoints require schema validation and explicit rejection of unknown fields to preserve predictable data handling.
- Provider access remains server-side only. Client components interact through the application’s own API surface rather than calling providers directly.
- The Home/Search, Strategy Library, Saved Strategies, and Settings screens can be server-first, while Builder, Optimizer, and analytics visualizations are client-heavy interactive surfaces.
- Mobile and desktop layouts differ, but the underlying builder workflow and analytics capabilities remain consistent across form factors.
- Vercel Cron is the default scheduling mechanism for snapshot jobs, but the domain model must not hard-code Vercel-specific assumptions into core business logic.

## Testing Decisions

- Good tests verify external behavior, user-visible outcomes, and stable module contracts rather than internal implementation details.
- Pricing-engine tests should focus on boundary conditions, monotonicity, scenario valuation correctness, max profit and max loss behavior, greeks aggregation, and chance-of-profit calculations.
- Strategy-template tests should verify that each supported v1 strategy produces the expected leg structure and payoff characteristics.
- Optimizer tests should verify deterministic candidate generation, ranking behavior for each objective, constraint enforcement, and builder handoff payloads.
- Provider-layer tests should verify deterministic mock responses, schema conformance, and consistent behavior across supported symbols and expiries.
- Persistence tests should cover save, load, rename, close, and snapshot flows, including realized and unrealized profit and loss calculations.
- Settings tests should verify default retrieval, updates, and downstream use in analytics when the user has not provided per-request overrides.
- Route-handler integration tests should validate request schemas, error responses, same-origin assumptions, and correct orchestration across provider, engine, and persistence modules.
- End-to-end tests should cover the highest-value workflows: loading a strategy template, editing builder inputs, seeing analytics update, running the optimizer, opening a result in the builder, saving a strategy, and closing a saved strategy.
- Scheduled-job tests should verify that snapshot processing iterates open strategies, computes current values, and persists historical records without mutating closed positions.
- Prior art for tests should follow the common project pattern of unit tests for pure domain modules, integration tests for route and persistence boundaries, and Playwright tests for full user journeys in deterministic mock mode.
- Coverage should be deepest around the pricing engine and optimizer because they contain the most consequential domain logic and the highest regression risk.

## Out of Scope

- Authentication, user accounts, subscriptions, or billing
- Unusual options flow and any flow-ingestion pipelines
- Shareable links or public read-only strategy pages
- Dividend modeling, dividend yield, discrete dividends, and ex-dividend events
- Brokerage integration, portfolio import, or live trade execution
- Futures options
- Dedicated cache infrastructure such as Redis or cache tables
- Sentiment grouping or proficiency grouping in the strategy library
- Partial closes for saved strategies
- Automatic Treasury ingestion for risk-free rates
- Shipping a real market-data vendor integration in v1

## Further Notes

- This PRD is derived from the repository research report and treats its confirmed v1 decisions as binding inputs.
- The application must repeatedly and clearly communicate that analytics are model-based estimates under simplifying assumptions and are not trading advice.
- The product should be designed so additional strategy templates and real provider adapters can be added later without restructuring the builder or analytics architecture.
- Performance expectations should target responsive recomputation for standard grids in mock mode on a typical developer laptop, with graceful degradation if larger grids are too expensive.
- Documentation should accompany implementation for architecture, pricing assumptions, mock data maintenance, setup, and deployment operations.
