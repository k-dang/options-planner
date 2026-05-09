## Problem Statement

Options Planner currently lets a user build and evaluate an options strategy, but the strategy is temporary. Once the user leaves the Builder, there is no first-class way to save the exact entry values they were looking at, revisit the trade later, or see whether the saved trade has gained or lost value over time.

The user wants to treat a built strategy as a paper/watchlist trade: save the strategy at the moment they choose, preserve the entry prices and entry evaluation, and later manually refresh the saved trade to see its current mark-to-market return.

## Solution

Add saved strategy monitoring for single-user paper trades.

The Builder page will allow the user to save the currently valid strategy. Saving captures the exact entry state at that moment, including the strategy legs, entry premiums, underlying price, generated name, entry evaluation, signed entry mark value, and capital at risk. Saved strategies are persisted in Postgres through Drizzle.

A new positions page will show a table of saved strategies. The first version is table-only and focuses on the core monitoring workflow: view saved strategies, see total return since saved, manually refresh the current mark, close a strategy at the latest market mark, and delete saved strategies.

Manual refresh will fetch current market data for the saved strategy, reprice each leg using current option mids when available, fall back to last price when needed, and fall back to model pricing only if market quotes are missing. Each refresh stores a timestamped mark snapshot. Total return is calculated from the latest snapshot against the immutable entry mark.

## User Stories

1. As an options trader, I want to save the strategy I built, so that I can track it after I leave the Builder.
2. As an options trader, I want the saved trade to preserve the exact entry premiums, so that future return calculations use the prices I chose to save.
3. As an options trader, I want the saved trade to preserve the entry underlying price, so that I can compare the current market against the original setup.
4. As an options trader, I want the saved trade to preserve the entry evaluation, so that the original risk, reward, breakeven, and Greeks are not recalculated later with different market data.
5. As an options trader, I want a generated default name for the saved strategy, so that I can recognize it without manually typing a name.
6. As an options trader, I want the generated name to include symbol, expiration, strikes, and strategy type, so that the saved row is readable at a glance.
7. As an options trader, I want to edit the saved strategy name later, so that I can add context or rename watchlist items.
8. As an options trader, I want to see all saved strategies in one table, so that I can quickly review my active watchlist.
9. As an options trader, I want saved strategies grouped or visually organized by symbol, so that multiple trades on the same underlying are easy to scan.
10. As an options trader, I want to see total return since saved, so that I know whether the saved trade is currently profitable.
11. As an options trader, I want total return shown in dollars, so that I know the absolute P/L.
12. As an options trader, I want total return shown as a percentage when capital at risk is known, so that I can compare trades of different sizes.
13. As an options trader, I want undefined-risk trades to avoid misleading return percentages, so that the app does not invent a risk denominator.
14. As an options trader, I want to see when the strategy was created, so that I know how long it has been monitored.
15. As an options trader, I want to see days until expiration, so that I can prioritize trades near expiration.
16. As an options trader, I want saved strategies to refresh only when I ask, so that opening the page does not unexpectedly call market data APIs.
17. As an options trader, I want a row-level refresh action, so that I can update one trade without refreshing every saved strategy.
18. As an options trader, I want a page-level refresh action eventually, so that I can update the whole watchlist when I choose.
19. As an options trader, I want refreshes to store timestamped marks, so that a return history can be added later without changing the persistence model.
20. As an options trader, I want current option marks to use bid/ask mids when available, so that P/L reflects tradable market pricing better than a theoretical model alone.
21. As an options trader, I want current option marks to fall back to last price when bid/ask mids are unavailable, so that refreshes can still produce useful output.
22. As an options trader, I want current option marks to fall back to model pricing when market quotes are missing, so that a saved strategy is not unusable because one quote cannot be found.
23. As an options trader, I want each saved mark to store per-leg mark details, so that pricing differences can be debugged later.
24. As an options trader, I want short option legs to reduce signed mark value, so that P/L works correctly for credit trades.
25. As an options trader, I want long option legs to increase signed mark value, so that P/L works correctly for debit trades.
26. As an options trader, I want total P/L to be latest signed mark value minus entry signed mark value, so that every strategy type uses a consistent calculation.
27. As an options trader, I want capital at risk to use finite max loss when available, so that percentage return matches options risk/reward conventions.
28. As an options trader, I want cash-secured puts to use collateral minus premium as capital at risk, so that return percentage is meaningful.
29. As an options trader, I want covered calls to use stock cost minus call credit as capital at risk, so that return percentage reflects committed capital.
30. As an options trader, I want to close a saved strategy, so that it stops being actively monitored.
31. As an options trader, I want closing to use the latest market mark, so that I do not need to manually enter exit prices in the first version.
32. As an options trader, I want closed strategies to remain visible, so that I can review completed saved trades.
33. As an options trader, I want closed strategies not to refresh automatically, so that their final return remains stable.
34. As an options trader, I want to delete saved strategies, so that test or unwanted saved trades can be removed.
35. As an options trader, I want deleting a strategy to delete its stored snapshots, so that the database does not keep orphaned monitoring data.
36. As an options trader, I want expired strategies to be distinguishable from open strategies, so that stale option positions are not confused with active trades.
37. As an options trader, I want the first version to avoid broker account integration, so that I can track paper/watchlist trades without brokerage setup.
38. As a developer, I want saved strategies stored in Postgres through Drizzle, so that the feature is deployable and has a migration-backed schema.
39. As a developer, I want the app to remain single-user for this version, so that auth does not block saved strategy monitoring.
40. As a developer, I want the pricing and return calculation isolated from UI code, so that the monitoring math can be unit tested.
41. As a developer, I want refresh behavior to be implemented as a server-side operation, so that market data credentials and database writes stay off the client.
42. As a developer, I want saved strategy state to reuse the existing strategy domain types, so that saved trades are compatible with current Builder and evaluator behavior.

## Implementation Decisions

- The feature tracks paper/watchlist strategies, not brokerage-linked live positions.
- Saving starts on the Builder page only.
- Optimizer cards will continue routing to Builder in the first version; direct save from Optimizer is out of scope.
- The app remains single-user in the first version. There is no auth or user ownership requirement.
- Persistence uses Postgres with Drizzle.
- Saved strategies have statuses: open, closed, and expired.
- Saving a strategy stores an immutable entry state and entry evaluation.
- Saving a strategy stores an entry snapshot with zero P/L and zero return.
- There is no daily close concept.
- Snapshots are timestamped observations created at save, refresh, or close time.
- Manual refresh is the only refresh behavior in the first version.
- Opening the positions page reads from the database and does not automatically call market data APIs.
- Total return is the only return column in the first version.
- Today's return is explicitly out of scope for the first version.
- The positions page is table-only in the first version.
- Return history charts are out of scope for the first version, but the snapshot model should support them later.
- Default strategy names are generated from symbol, expiration, strikes, and strategy label.
- Generated names are editable after saving.
- Current option quote matching uses saved symbol, expiration, strike, and option type.
- Current option mark preference order is mid price, then last price, then model fallback.
- Per-leg mark metadata is stored with each snapshot, including source information.
- Signed mark value is calculated as positive for long legs and negative for short legs.
- Unrealized P/L is latest signed mark value minus entry signed mark value.
- Return percentage is unrealized P/L divided by capital at risk.
- Finite-risk strategies use absolute max loss from entry evaluation as capital at risk.
- Covered calls use stock cost minus received call premium as capital at risk.
- Cash-secured puts use strike collateral minus received premium as capital at risk.
- Undefined-risk strategies show dollar P/L and no return percentage unless a future margin basis is defined.
- Closing a strategy uses the latest market mark available through the same refresh calculation.
- Closing stores a close snapshot and marks the saved strategy closed.
- Deleting a saved strategy removes the saved strategy and its snapshots.
- Expired strategies should be visually distinguishable and should not be treated as active open trades.

The major modules to build or modify are:

- Database schema and migrations for saved strategies and snapshots.
- Persistence/query module for creating, listing, updating, closing, and deleting saved strategies.
- Monitoring/pricing module for calculating signed entry marks, current marks, P/L, return percentage, and per-leg mark metadata.
- Name-generation module for readable strategy names.
- Builder save action and UI affordance.
- Positions page table with row actions.
- Server-side actions or route handlers for save, refresh, close, rename, and delete.

The monitoring/pricing module should be a deep module with a narrow interface. It should accept a saved strategy entry plus current market data and return a normalized snapshot result. UI and database code should not duplicate P/L math.

## Testing Decisions

Good tests should verify externally observable behavior and financial calculations, not implementation details. Tests should cover what the app promises to users: saved entries remain immutable, marks are signed correctly, total return is calculated consistently, and status-changing actions produce the right persisted outcome.

The highest-value tests are:

- Unit tests for signed mark value calculation across long options, short options, long stock, and short stock.
- Unit tests for unrealized P/L as latest mark minus entry mark.
- Unit tests for capital-at-risk calculation for finite-risk strategies, covered calls, cash-secured puts, and undefined-risk strategies.
- Unit tests for generated strategy names across single-leg, vertical spread, iron condor, straddle, and strangle shapes.
- Unit tests for current quote selection preference: mid, last, model fallback.
- Unit tests for days-until-expiration calculation.
- Persistence tests or integration-style tests for creating a saved strategy with an entry snapshot.
- Persistence tests or integration-style tests for refresh creating a mark snapshot without mutating entry values.
- Persistence tests or integration-style tests for close creating a close snapshot and changing status.
- Persistence tests or integration-style tests for delete removing strategy and snapshots.
- UI tests can be lighter in the first version and focus on whether the positions table renders saved rows and action states from server data.

Prior art exists in the codebase for options-domain unit tests around strategy validation, evaluation, builder state, optimizer behavior, provider normalization, and generated option data. The new monitoring math should follow the same style: deterministic inputs, no live network calls, and assertions against returned domain objects.

## Out of Scope

- Brokerage account integration.
- Real order execution or fill import.
- Multi-user auth or user ownership.
- Automatic refresh on page load.
- Scheduled daily jobs.
- Daily close snapshots.
- Today's return column.
- Return history charts.
- Direct save from Optimizer cards.
- Manual exit price entry when closing.
- Portfolio-level aggregation.
- Margin-model return percentages for undefined-risk trades.
- Alerts, notifications, or threshold monitoring.
- Adjustments, partial exits, rolling legs, or trade event journals.

## Further Notes

The user specifically wants the saved entry to be anchored to the prices available at the moment they click Save. This feature should not reinterpret the entry as a broker fill or as an official daily close. The first version should optimize for trust in the saved entry and clarity of the current total return.

Because the app is planned for deployment, Postgres is preferred over SQLite even though the first version is single-user. The schema should avoid overfitting to single-user operation so that user ownership can be added later without rewriting the monitoring model.

The existing Builder, strategy evaluator, and option chain provider code should be reused rather than reimplemented. The monitoring feature should add persistence and mark-to-market tracking around the existing strategy model.
