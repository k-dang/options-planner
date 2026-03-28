# Options Strategy Visualizer v1 Functional Parity PRD

**Status:** Draft for comparison
**Date:** 2026-03-27
**Source inputs:** `deep-research-report.md`, existing `PRD.md`

## Purpose

This document is an alternate PRD for the same product direction captured in the existing repository materials. It is intended to be easier to compare at the product level by emphasizing user value, workflow boundaries, release criteria, and explicit v1 trade-offs rather than exhaustive implementation detail.

## Product Summary

Build a single-user web application that helps an options trader model, compare, and revisit common options strategies through a builder, a bounded optimizer, and saved strategy tracking. The product should feel functionally comparable to the core OptionStrat workflow for supported strategies, while remaining intentionally narrower in scope, easier to ship, and easier to maintain.

The product is educational software. All analytics, profit and loss projections, and probabilities are model-based estimates under simplifying assumptions and must be presented as such. The product does not provide trading advice, brokerage connectivity, or social sharing.

## Problem Statement

Retail options tools often fall into one of two bad patterns:

- they are too shallow to support meaningful scenario analysis across time, volatility, and pricing assumptions
- they are too broad, account-centric, or workflow-heavy for a user who only wants to model and compare trades

The user needs a fast way to:

- select an underlying
- start from a known strategy structure
- adjust strikes, expiries, quantities, and assumptions
- see immediate payoff and risk changes across time and price
- compare candidate strategies against a simple thesis
- save ideas and review how they changed over time

## Target User

The primary user is a self-directed options trader who already understands basic strategy names and wants a focused analysis tool rather than a brokerage platform.

The user is comfortable with concepts like spreads, straddles, breakevens, implied volatility, and time decay, but still benefits from strong defaults, fast visual feedback, and explicit wording around model limitations.

## Product Principles

1. Functional parity over visual mimicry.
   The goal is to support the same core jobs the user expects from an OptionStrat-style workflow, not to reproduce every surface or interaction exactly.

2. Fast iteration beats catalog breadth.
   The builder must feel immediate. A narrower strategy set is acceptable if the supported set is reliable, understandable, and analytically strong.

3. Assumptions must stay visible.
   Inputs like IV, pricing mode, commissions, and risk-free rate materially affect outputs. They cannot be hidden behind opaque defaults.

4. Product scope stays narrow.
   No auth, no billing, no share links, no unusual flow, no brokerage connectivity, and no dividend modeling in v1.

5. Architecture stays extensible where it matters.
   A real provider may be added later, but v1 ships only with a deterministic mock provider and must still behave like a real product.

## Goals

### Primary goals

- Deliver an interactive strategy builder with immediate recalculation after edits.
- Support a strategy library that uses exact OptionStrat names for the approved v1 set.
- Provide a bounded optimizer that ranks candidate strategies against an explicit objective.
- Persist saved strategies and record daily mark-to-market snapshots.
- Ship as a Vercel-first full-stack Next.js application backed by PostgreSQL.

### Success criteria

- A user can open a supported strategy template, adjust legs and assumptions, and understand the resulting payoff without leaving the builder.
- A user can run the optimizer against a thesis and move a ranked result back into the builder in one step.
- A user can save a strategy, reopen it later, and review daily snapshot history.
- The app runs fully in mock mode with no external API keys.
- The product communicates limitations clearly enough that users understand outputs are estimated and educational.

## Non-Goals

- Authentication, accounts, subscriptions, or billing
- Public sharing, share links, or collaborative workflows
- Unusual options flow analysis
- Brokerage integration or live trade execution
- Portfolio import
- Futures options
- Dividend modeling, dividend yield, discrete dividends, or ex-dividend handling
- Partial position closes
- A dedicated cache layer in v1
- Shipping a real market-data vendor in v1

## v1 Scope

### Screen set

The product includes six top-level areas:

- Home / Search
- Strategy Builder
- Strategy Library
- Optimizer
- Saved Strategies
- Settings

### Supported strategy set

The strategy library and optimizer are limited to:

- Long Call
- Long Put
- Short Call
- Short Put
- Bull Call Spread
- Bear Put Spread
- Bull Put Spread
- Bear Call Spread
- Iron Condor
- Long Straddle
- Long Strangle
- Covered Call
- Cash-Secured Put

## Core User Workflows

### 1. Start analysis from a symbol

The user searches for an underlying from the home screen and enters the builder with that symbol preselected. The home screen also provides direct entry points into the library, optimizer, saved strategies, and settings.

### 2. Build and edit a strategy

The builder is the primary surface. The user can:

- load a strategy template
- edit option legs directly
- change strike, expiry, side, quantity, and entry pricing mode
- change valuation horizon
- override implied volatility globally or by expiry
- override risk-free rate
- configure commissions

Every significant change should trigger immediate recalculation without forcing the user through a submit-based workflow.

### 3. Interpret the trade visually

The builder must present:

- summary metrics
- a profit and loss table over future dates and underlying prices
- a chart for a selected date slice
- aggregated greeks
- chance of profit at the selected horizon and at expiration

The chart should support exact hover values, breakeven markers, and modeled probability overlays including plus and minus 1x and 2x implied move guides.

### 4. Compare candidate strategies

The optimizer collects a simple thesis:

- underlying symbol
- target price
- target date or expiration window
- ranking objective
- constraints

It searches only the approved v1 strategy subset, produces a ranked list, and allows any result to be opened in the builder for deeper analysis.

### 5. Save and revisit strategies

The user can save the current builder state, rename saved entries, reopen them later, and close them in a single all-legs action. Open saved strategies receive daily mark-to-market snapshots so the user can review unrealized changes over time.

## Functional Requirements

### Builder

- The builder must support immediate recalculation after edits to legs or assumptions.
- The builder must support desktop and mobile layouts without removing core analytical capability.
- The builder must expose entry-price mode choices: bid, ask, mark, mid, and manual.
- The builder must expose valuation horizon in days.
- The builder must show net debit or credit, max profit, max loss, breakevens, net greeks, and chance of profit values.
- The builder must support saving locally persisted strategies.

### Library

- The library must present the approved v1 strategy set using exact names.
- Each item must include a short explanation and a compact leg-pattern summary.
- Each item must open directly in the builder.

### Optimizer

- The optimizer must remain bounded and deterministic.
- The optimizer must support at least two ranking modes: maximum expected profit at target and maximum modeled chance of profit.
- The optimizer must expose constraint inputs, including max loss, max legs, and strike window.
- The UI must explain how the chosen ranking mode works.

### Saved Strategies

- Saved strategies must persist full builder state plus normalized leg data.
- Each saved strategy must have an open or closed status only.
- Daily snapshots must record current net value and unrealized profit and loss for open strategies.
- Closing a strategy must store exit prices and realized profit and loss.

### Settings

- Settings must support commission defaults, grid defaults, IV behavior defaults, and default risk-free rate.
- Settings must expose provider diagnostics so the user can confirm the app is using the mock provider.

## Product and UX Requirements

- The UI should prioritize comprehension over density. The builder is allowed to be information-rich, but not opaque.
- Functional parity matters more than exact visual parity with OptionStrat.
- Desktop should use a two-pane builder layout.
- Mobile should use a stacked layout with collapsible controls.
- Critical interactions must be keyboard accessible.
- The application must repeatedly disclose that analytics are model-based estimates and not advice.

## Data and Platform Requirements

- The app must be built as a full-stack Next.js App Router application.
- The primary deployment target is Vercel.
- The primary database is PostgreSQL from day one.
- All write endpoints must validate payloads and reject unknown fields.
- Market data access must go through a provider abstraction.
- The only shipped provider in v1 is a deterministic mock provider.
- Daily snapshot jobs should run through a scheduled mechanism appropriate for Vercel deployment.

## Analytics and Modeling Requirements

- The system must value positions across future dates before expiration, not only at expiry payoff.
- The system must support Black-Scholes-Merton for European-style scenario valuation.
- The system must support an American-style approximation for American options.
- Chance-of-profit outputs must be shown both at the selected horizon and at expiration.
- Profitability calculations must include commissions.
- The app must clearly document the simplifying assumptions behind its analytics.

## Release Acceptance Criteria

- A user can search for a symbol and begin a builder workflow from it.
- A user can load every supported v1 strategy template into the builder.
- A user can modify legs and assumptions and see the table, chart, and summary metrics update immediately.
- A user can run the optimizer and open a result in the builder.
- A user can save, reopen, and close a strategy.
- A user can view daily mark-to-market history for an open strategy.
- The app works end to end using only the mock provider.
- The deployment path is documented for Vercel plus PostgreSQL.

## Trade-Offs Chosen for v1

| Decision | Chosen approach | Rejected alternative | Reason |
|---|---|---|---|
| Product breadth | Narrow strategy subset | Broad catalog from day one | Keeps optimizer and QA bounded |
| Market data | Mock provider only | Real vendor integration in v1 | Preserves delivery speed and deterministic testing |
| Persistence | PostgreSQL from the start | Local-only SQLite dev split | Matches intended deployment target and avoids dual-path drift |
| Snapshot cadence | Daily | Intraday or hourly | Good enough for v1 without extra ops cost |
| UX target | Functional parity | Pixel-level cloning | Focuses effort on user jobs instead of mimicry |

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Pricing and probability outputs are trusted too literally by users | Medium | High | Prominent educational disclosures and documented assumptions |
| Builder recomputation becomes sluggish on larger grids | Medium | High | Bound default grid sizes and degrade gracefully when needed |
| Optimizer expectations drift toward full catalog coverage | High | Medium | Keep supported strategy set explicit in product copy and settings |
| Mock data is too synthetic to validate workflows credibly | Medium | Medium | Maintain a versioned dataset with realistic structure and repeatable generation |
| Daily snapshots feel too sparse for some users | Medium | Low | Treat finer cadence as a post-v1 enhancement rather than expanding now |

## Open Questions

- Which underlyings should be included in the initial mock dataset so demos and tests represent realistic usage?
- How much builder state should be encoded into saved snapshots versus recalculated from current defaults on load?
- What default grid sizes best balance responsiveness and analytical usefulness on typical laptops?

## Recommendation

Proceed with this narrower, workflow-centered PRD as the preferred product framing for v1. It preserves the major product promises from the research report while drawing cleaner release boundaries, fixing the deployment posture around Vercel and PostgreSQL, and keeping the UX target focused on functional parity instead of clone-level fidelity.
