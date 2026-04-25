## Problem Statement

Traders who want to explore and compare options strategies need a simpler version of OptionStrat's builder and optimizer without the surrounding product surface area. The immediate need is a desktop-first tool that lets a user construct common US equity options strategies, inspect trustworthy analytics, and share the exact strategy state through the URL. The tool should support both a manual strategy builder (`/build`) and an optimizer (`/optimize`) that helps users search across strategy families using adjustable inputs.

The current codebase is a fresh Next.js application with no domain logic, no pricing engine, no strategy model, and no market-data integration. The product therefore needs a clean foundation that starts with mocked but plausible option chains and is intentionally designed so real market data can be integrated later without rewriting the core strategy and analytics system.

## Solution

Build a desktop-focused options planning application with two primary workflows:

1. A `/build` experience where the user selects a strategy, configures legs and underlying assumptions, and sees payoff analytics, summary metrics, and a shareable URL that captures the strategy state.
2. An `/optimize` experience where the user provides constraints and ranking preferences, and the client searches across multiple supported strategy families to surface the best candidates from generated sample chains.

The product will initially target US equity options only, using standard 100-share contracts, American-style exercise assumptions, and standard weekly/monthly expirations. Market data in v1 will come from generated plausible sample chains rather than a live provider, but the architecture will separate chain acquisition from pricing, optimization, and presentation so a real data source can be added later.

The application will include a real options analytics engine rather than purely educational heuristics. Even with mocked chains, it should compute values and rankings through a pricing model with volatility inputs, Greeks, breakevens, max profit/loss, and strategy-level metrics that are credible enough for serious planning use.

## User Stories

1. As a retail options trader, I want to open a strategy builder for a stock symbol, so that I can model a trade idea without starting from scratch.
2. As a trader, I want to choose from common strategy templates such as covered call, cash-secured put, long call, long put, bull call spread, and bear put spread, so that I can get to a useful starting position quickly.
3. As a trader, I want each strategy template to preconfigure the expected leg structure, so that I do not have to manually remember every leg combination.
4. As a trader, I want to adjust strikes, expirations, premiums, quantity, and underlying price assumptions, so that the trade reflects my thesis.
5. As a trader, I want to see a payoff chart, so that I can understand how profit and loss change as the stock price moves.
6. As a trader, I want the payoff chart to reflect the current strategy state immediately, so that I can iterate quickly.
7. As a trader, I want to inspect payoff at expiration and at intermediate dates when available, so that I can understand both terminal and time-dependent behavior.
8. As a trader, I want to see max profit, max loss, and breakeven values, so that I can judge the basic risk and reward profile.
9. As a trader, I want to see Greeks for the strategy and its legs, so that I can understand directional, volatility, and time sensitivities.
10. As a trader, I want to see cost basis, credit/debit, and capital usage, so that I can understand how much capital the position requires.
11. As a trader, I want a URL that captures the current strategy state, so that I can bookmark or share a trade setup.
12. As a trader, I want a shared URL to reopen the same trade setup exactly, so that collaboration does not depend on a backend account system.
13. As a trader, I want the builder route format to be simple and stable even if it does not match OptionStrat exactly, so that links remain understandable and maintainable.
14. As a trader, I want strategy definitions to support both single-leg and multi-leg structures, so that the product can grow beyond basic trades.
15. As a trader, I want covered calls and cash-secured puts to treat the stock or cash component correctly, so that capital and payoff are modeled realistically.
16. As a trader, I want the builder to clearly distinguish between stock legs and option legs, so that combined strategies are understandable.
17. As a trader, I want the application to validate impossible or malformed combinations, so that I do not rely on broken calculations.
18. As a trader, I want to change the underlying symbol and regenerate a plausible option chain, so that I can explore different names.
19. As a trader, I want the sample chain to look realistic enough across strikes and expirations, so that optimization results are meaningful.
20. As a trader, I want the system to support weekly and monthly expirations, so that the generated choices resemble real US equity options chains.
21. As a trader, I want the application to use a real pricing model with volatility assumptions, so that analytics are more trustworthy than simple intrinsic-value math.
22. As a trader, I want the pricing model to remain separate from the UI, so that analytical correctness is easier to test and evolve.
23. As a trader, I want the system to model implied volatility inputs even when the chain is generated, so that pricing and Greeks stay internally consistent.
24. As a trader, I want the optimizer to search across multiple strategy families in one results view, so that I can compare different trade types under the same thesis.
25. As a trader, I want the optimizer to let me specify a bullish, bearish, or income-oriented setup through filters and controls, so that the results match my goal.
26. As a trader, I want to adjust optimizer inputs such as target expiration window, underlying assumptions, and acceptable risk, so that I can shape the result set.
27. As a trader, I want ranking modes like max profit, max return on capital, downside buffer, target probability of profit, and delta range, so that optimization matches different decision styles.
28. As a trader, I want optimizer results to update client-side as I change filters, so that the workflow feels exploratory rather than request-driven.
29. As a trader, I want optimizer results to show enough summary detail to compare candidates quickly, so that I can shortlist ideas without opening each one.
30. As a trader, I want to open any optimizer result in the builder, so that I can inspect and refine it in more detail.
31. As a trader, I want the optimizer to start with single-leg support where necessary but be architected for multi-leg results, so that future expansion does not require a rewrite.
32. As a trader, I want probability-based metrics to be clearly tied to model assumptions, so that I understand what is estimated versus guaranteed.
33. As a trader, I want strategy-specific constraints to be enforced during optimization, so that invalid candidates are never ranked.
34. As a trader, I want the app to stay anonymous and stateless except for URL sharing, so that I can use it without signing in.
35. As a developer, I want a chain-provider abstraction, so that mocked data can later be replaced with a live vendor adapter.
36. As a developer, I want strategy templates to compile into a normalized position model, so that analytics and optimization can operate on one internal representation.
37. As a developer, I want serialization and parsing logic for URLs to be deterministic, so that links are stable and testable.
38. As a developer, I want a deep analytics module with a narrow public interface, so that core pricing behavior can be tested independently of Next.js routes.
39. As a developer, I want the optimizer engine to rank candidates from normalized strategy evaluations, so that new ranking modes can be added without rewriting route code.
40. As a developer, I want the route and page structure to align with current Next.js app-router conventions, so that future work does not rely on outdated assumptions.

## Implementation Decisions

- The product will include two top-level user routes: a manual builder route at `/build` and an optimizer route at `/optimize`.
- The builder and optimizer will be implemented as separate page-level experiences that share the same underlying domain modules for chains, strategy definitions, pricing, evaluation, and URL serialization.
- The product will not attempt to clone OptionStrat's URL schema. Instead, it will use a simpler canonical scheme that preserves the full strategy state needed to reopen a trade configuration.
- URL state for v1 will include the full strategy state only. It will not persist transient UI state such as selected tabs, chart preferences, or optimizer panel layout.
- The first supported strategy set will include covered call, cash-secured put, long call, long put, bull call spread, and bear put spread.
- Strategy support will be modeled through templates that describe leg structure, allowed edits, validation rules, and derived capital/risk semantics.
- The internal position model will normalize stock legs, call legs, put legs, long/short direction, expiration, strike, premium, and quantity so every feature operates on a common representation.
- Covered calls and cash-secured puts will be first-class strategies rather than thin aliases, because they require stock/cash semantics and capital treatment that differ from naked option positions.
- The optimizer will search across multiple strategy families in one client-side results view rather than forcing the user to optimize only one strategy at a time.
- The optimizer will support ranking modes for max profit, max return on capital, downside buffer, target probability of profit, and delta range in v1.
- The optimizer will use adjustable user inputs similar in spirit to OptionStrat's optimize flow, but tailored to a simpler desktop-first tool.
- The optimizer will initially be allowed to prioritize single-leg support where necessary for early implementation, but the architecture must support multi-leg candidate generation and ranking as a core design requirement.
- The application will target US equity options only in v1.
- Contract assumptions will be standard 100-share contracts, American-style exercise, and standard weekly/monthly expirations.
- There will be no authentication, watchlists, saved server-side strategies, or user accounts in this PRD.
- Market data in v1 will come from generated plausible option chains rather than static fixtures or a live feed.
- The sample-chain system will generate internally consistent chains around a current underlying price with expirations, strike ladders, volatility assumptions, and pricing outputs that look realistic enough for analytics and optimization work.
- The sample-chain system will be isolated behind a chain provider interface so that a real data adapter can be added later without changing the builder or optimizer contracts.
- The analytics engine will use a real options pricing model and volatility inputs rather than relying only on intrinsic value or simplistic payoff math.
- The analytics engine will compute strategy-level and leg-level metrics including payoff data, max profit/loss, breakevens, Greeks, capital usage, and model-derived probability-style metrics where those are exposed in the UI.
- Estimated metrics such as probability of profit will be clearly derived from model assumptions and should be labeled as such in product copy and UI.
- The payoff chart will be in scope and treated as a core visualization in the builder. It should show profit/loss against underlying stock price and support at least expiration analysis, with room for pre-expiration evaluation as the engine matures.
- The codebase should prefer deep modules with simple interfaces over route-level business logic. Candidate modules include chain generation, pricing/Greeks, strategy template compilation, strategy evaluation, optimization/ranking, and URL parsing/serialization.
- The Next.js app should follow the current app-router file conventions from the installed local documentation, including page-driven routes, dynamic segments where needed, and colocated private implementation folders as appropriate.
- Since the app is desktop-first, the information density and controls can prioritize larger screens rather than mobile-first compression, though the layout should still degrade gracefully on smaller widths.
- The builder should allow navigation from an optimizer result into a fully populated build state using the canonical serialized strategy format.

## Testing Decisions

- Good tests should validate external behavior and financial outputs, not internal implementation details or component structure.
- The highest-confidence test coverage should be placed around the domain modules where mistakes would produce incorrect analytics or rankings.
- The pricing and strategy engine should have deterministic automated tests covering leg valuation, strategy payoff aggregation, max profit/loss, breakevens, capital usage, and Greeks outputs for representative trades.
- The URL parser/serializer should have round-trip tests proving that a strategy state serializes to a canonical form and deserializes without loss.
- The strategy template layer should have tests for validation behavior, required legs, legal edits, and strategy-specific constraints.
- The sample-chain generator should have tests for structural plausibility and consistency, such as expiration ordering, strike ladder generation, bid/ask sanity, and monotonic relationships where applicable.
- The optimizer engine should have tests for candidate generation, filtering, and ranking across the supported ranking modes.
- Probability-based and model-derived metrics should have tests that assert consistent outputs for fixed assumptions and document the assumptions under which the numbers are meaningful.
- The builder and optimizer pages should have lighter integration tests covering key workflows: loading a strategy from a URL, editing inputs, seeing analytics update, running an optimization, and opening a result in the builder.
- UI tests should focus on user-observable behavior rather than snapshots of layout internals.
- Because the current repo is a fresh starter with no established test prior art, the implementation should create the initial testing patterns around the deep domain modules first and use those as the standard for future work.

## Out of Scope

- Live broker integration or order execution.
- Authentication, user profiles, watchlists, server-side saved strategies, or portfolio tracking.
- Support for non-US markets, index options, futures options, crypto options, or non-standard contract multipliers.
- Mobile-first product design as a primary objective.
- Matching OptionStrat's exact route structure, visual design, information architecture, or full strategy catalog.
- Brokerage-grade live market data in v1.
- News, unusual flow, social features, alerts, educational content, or trading journals.
- Full margin modeling across brokers and account types.
- Tax treatment, compliance workflows, or investment-advice features.
- Unlimited strategy combinations in v1 beyond the explicitly supported set.

## Further Notes

- The most important architectural decision is to keep the financial logic independent from the route/UI layer. This project will only stay maintainable if pricing, strategy normalization, evaluation, and optimization are implemented as deep modules with narrow interfaces.
- Even though v1 uses generated chains, the analytics quality target is materially higher than a demo calculator. The mock-data layer should exist to unblock product development, not to excuse weak modeling.
- A likely future phase is to add a live chain provider while preserving the same strategy evaluation and optimization pipeline.
- A likely future extension is to widen strategy coverage after the first set is stable, reusing the same template and normalization system.