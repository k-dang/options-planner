Status: ready-for-agent

## Problem Statement

Options Planner can compare Risk/Reward Candidates using theoretical probability of profit, return on risk, max profit, and max loss, but those metrics do not directly answer a practical discovery question: how much room does the underlying have to move against this setup before the trade reaches breakeven?

The user considered historical profit factor, but the app will not have enough completed historical trades to make that metric trustworthy. The user needs a current-chain metric that is honest from available data, comparable across strategy types, and visible without changing existing candidate ranking.

## Solution

Add **Expected Move Cushion** as a new visible metric on Risk/Reward Candidate comparison tables.

Expected Move Cushion is a signed expected-move multiple. It compares the distance from the current underlying price to the nearest adverse breakeven against the option-chain-implied expected move for the candidate's expiration window. Positive values mean the setup has room before breakeven. Negative values mean the setup needs favorable movement before it reaches breakeven. Unavailable values display as `n/a`.

The first version should surface the final signed multiple only, such as `+1.4x`, `-0.6x`, or `n/a`. It should appear consistently anywhere the shared Risk/Reward Candidate table is used, including single-symbol scans and Ticker Watchlist scan results. It should be sortable as its own column, but it must not contribute to the existing candidate score in v1.

## User Stories

1. As an options trader, I want to see Expected Move Cushion on each Risk/Reward Candidate, so that I can compare how much room each setup has before breakeven.
2. As an options trader, I want Expected Move Cushion to use current option-chain data, so that the metric does not depend on an invalidly small set of completed historical trades.
3. As an options trader, I want Expected Move Cushion to be signed, so that I can distinguish setups with current cushion from setups that need favorable movement.
4. As an options trader, I want positive Expected Move Cushion values to mean the underlying can move against the setup before breakeven, so that the meaning is intuitive while scanning.
5. As an options trader, I want negative Expected Move Cushion values to mean the setup must move in my favor before breakeven, so that long premium and debit-style candidates remain comparable.
6. As an options trader, I want `0.0x` to mean the current underlying price is at breakeven, so that zero is not confused with missing data.
7. As an options trader, I want missing or uncomputable Expected Move Cushion values to display as `n/a`, so that the app does not imply false precision.
8. As an options trader, I want the metric to use the nearest adverse breakeven, so that it reflects the first breakeven boundary that matters for the setup.
9. As an options trader, I want multi-breakeven strategies to use the nearest relevant breakeven, so that iron condors, short straddles, and short strangles produce a single comparable value.
10. As an options trader, I want a candidate inside a multi-breakeven profitable range to show positive cushion to the nearer boundary, so that the metric reflects the most immediate risk.
11. As an options trader, I want a candidate outside a multi-breakeven profitable range to show a negative value, so that I can see how much favorable movement is required to return to breakeven.
12. As an options trader, I want the metric to use the strategy's existing profitable range semantics, so that it agrees with probability of profit and breakeven behavior.
13. As an options trader, I want Expected Move Cushion to be normalized by expected move, so that underlyings with different prices and volatility levels can still be compared.
14. As an options trader, I want expected move to be derived from the candidate's option-leg implied volatility, so that the metric is available from the data the app already uses.
15. As an options trader, I want expected move to use the candidate's days to expiration, so that shorter and longer expiration windows are scaled appropriately.
16. As an options trader, I want zero-DTE candidates to still show a value when possible, so that the metric remains useful where cushion can matter most.
17. As an options trader, I want zero-DTE candidates to use a one-day floor, so that the calculation avoids zero-time expected-move math.
18. As an options trader, I want the table to show only the final signed multiple, so that the candidate table remains scannable.
19. As an options trader, I want Expected Move Cushion to be sortable, so that I can quickly find candidates with the most room before breakeven.
20. As an options trader, I want sorting by Expected Move Cushion to put higher signed values first, so that better cushion naturally rises to the top.
21. As an options trader, I want `n/a` values to sort last, so that missing values do not outrank real candidate metrics.
22. As an options trader, I want positive values to be visually distinct from negative values, so that cushion and hurdle states are easy to scan.
23. As an options trader, I want Expected Move Cushion on the single-symbol scanner, so that I can use it while exploring one ticker.
24. As an options trader, I want Expected Move Cushion on Ticker Watchlist scan results, so that I can compare candidates across underlyings with the same metric.
25. As an options trader, I want the existing score to remain unchanged, so that adding this metric does not silently alter candidate ranking.
26. As an options trader, I want the metric to sit beside existing Risk/Reward metrics, so that I can judge cushion together with return on risk and probability of profit.
27. As an options trader, I want long calls, long puts, debit spreads, credit spreads, short volatility strategies, and income strategies to all use one metric definition, so that I do not have to learn strategy-specific variants.
28. As an options trader, I want the app to avoid historical profit factor until there is enough valid trade history, so that discovery metrics do not become misleading.
29. As a developer, I want Expected Move Cushion computed as part of Risk/Reward Candidate summary data, so that every existing candidate consumer can access it consistently.
30. As a developer, I want the calculation to reuse existing breakevens and profitable range metadata, so that the app does not develop a second rule system for strategy outcomes.
31. As a developer, I want the calculation to return `null` when required inputs are unavailable, so that UI and sorting can represent missing data honestly.
32. As a developer, I want the candidate score calculation to ignore Expected Move Cushion in v1, so that the new metric can be inspected before it affects ranking.
33. As a developer, I want tests around signed distance behavior, so that above, below, and between profitable ranges remain correct as strategies evolve.
34. As a developer, I want tests around zero-DTE handling, so that the one-day floor stays intentional.
35. As a developer, I want tests around unavailable values, so that missing breakevens, option legs, invalid IV, or invalid expected move do not produce false zeros.
36. As a developer, I want table sorting tests for Expected Move Cushion, so that descending signed sort and unavailable-last behavior stay stable.

## Implementation Decisions

- Expected Move Cushion is a Risk/Reward Candidate metric, not a Saved Strategy metric.
- The metric is added as a visible candidate comparison value, not as a replacement for score.
- The metric does not contribute to candidate score in v1.
- The metric should be available from candidate summary data so scanner, optimizer, and table consumers can use the same value.
- The core formula is signed distance to nearest adverse breakeven divided by expected move.
- Expected move is derived from the candidate's current underlying price, averaged option-leg implied volatility, and effective days to expiration.
- Effective days to expiration uses a one-day floor.
- The expected move formula is current underlying price times average option-leg implied volatility times the square root of effective days to expiration divided by 365.
- Average option-leg implied volatility uses the candidate's option legs only; stock legs do not contribute.
- Candidates with no option legs produce an unavailable Expected Move Cushion.
- Candidates with no breakevens produce an unavailable Expected Move Cushion.
- Candidates with missing, non-finite, or non-positive implied volatility inputs produce an unavailable Expected Move Cushion unless existing candidate construction has already provided valid fallback IVs.
- Candidates with non-finite underlying price or expected move produce an unavailable Expected Move Cushion.
- Single-breakeven strategies use the strategy template's profitable range to determine signed direction.
- For profitable range `above`, signed distance is current underlying price minus breakeven.
- For profitable range `below`, signed distance is breakeven minus current underlying price.
- For profitable range `between`, current price inside the range returns the positive distance to the nearer breakeven.
- For profitable range `between`, current price outside the range returns the negative distance back to the nearest breakeven.
- Multi-breakeven strategies use the closest breakeven separating current price from losing territory.
- The signed direction follows existing strategy template profitable range metadata rather than introducing a separate strategy rule map.
- If a strategy has breakevens but no profitable range metadata, the metric should be unavailable rather than guessed.
- Candidate tables display only the final signed expected-move multiple.
- Positive table values should render in the app's profit styling.
- Negative table values should render in the app's destructive styling.
- Unavailable table values should render as muted `n/a`.
- Table display should include an explicit sign for positive and negative numeric values.
- Candidate tables gain an Expected Move Cushion sort option.
- Sorting by Expected Move Cushion uses descending signed numeric value by default.
- Unavailable Expected Move Cushion values sort last.
- The metric appears anywhere the shared Risk/Reward Candidate table is used.
- Single-symbol scan results and Ticker Watchlist scan results should both show the metric through the shared table.
- Strategy cards are out of the first placement unless implementation naturally reuses candidate summary data without additional UI scope.
- No database schema changes are required.
- No historical options data provider is required.
- No completed-trade history is required.
- No tooltip or raw-detail display is required in v1.

## Testing Decisions

Good tests should verify domain behavior from existing seams rather than internal helper details. The main behavior to protect is that Risk/Reward Candidates expose a correct, signed, nullable Expected Move Cushion and that shared candidate tables sort and display that value consistently.

The highest-value domain seam is candidate generation and shaping. Existing optimizer and scanner tests already assert generated candidates, summary fields, scoring, and render-ready rows. The Expected Move Cushion tests should follow that style with deterministic option-chain inputs and assertions against returned candidate summary data.

Domain tests should cover:

- A profitable range `above` candidate with positive cushion.
- A profitable range `above` candidate with negative cushion.
- A profitable range `below` candidate with positive cushion.
- A profitable range `below` candidate with negative cushion.
- A profitable range `between` candidate inside the profitable range.
- A profitable range `between` candidate below the lower breakeven.
- A profitable range `between` candidate above the upper breakeven.
- Choosing the nearest breakeven when two breakevens exist.
- Returning `null` when there are no breakevens.
- Returning `null` when there are no option legs.
- Returning `null` when implied volatility cannot produce a usable expected move.
- Using a one-day floor for zero-DTE candidates.
- Leaving candidate score unchanged when Expected Move Cushion changes.
- Including the value in render-ready row shaping if row shaping is still used by consumers.

The shared table behavior should be tested at the highest practical UI or component seam available in the codebase. If there is no existing component testing setup, the implementation may keep comparison logic simple and cover sorting behavior through a small exported table-sort helper or equivalent narrow seam.

Table tests should cover:

- Rendering positive values with an explicit plus sign and `x` suffix.
- Rendering negative values with a minus sign and `x` suffix.
- Rendering unavailable values as `n/a`.
- Default sort direction for Expected Move Cushion is descending.
- Numeric sort order is descending signed value.
- Unavailable values sort last.
- The column appears for both ticker-hidden and ticker-visible table modes.

Prior art exists in the codebase for deterministic options-domain tests around optimizer scanning, generated providers, strategy evaluation, and candidate row shaping. This feature should reuse that testing style and avoid live provider calls.

## Out of Scope

- Historical profit factor.
- Historical backtesting.
- Completed-trade analytics.
- Changing the existing candidate score.
- Blending Expected Move Cushion into ranking.
- Persisting Expected Move Cushion.
- Adding database columns.
- Adding a new market-data provider dependency.
- Using ATM straddle pricing as the expected-move source.
- Displaying raw expected move, nearest breakeven, distance to breakeven, average IV, or effective DTE in the table.
- Adding a tooltip or detail drawer for raw calculation inputs.
- Adding Expected Move Cushion to strategy cards as a required v1 surface.
- Alerts or thresholds based on Expected Move Cushion.
- User-configurable metric weighting.
- Strategy-specific custom cushion formulas.
- Broker execution behavior.

## Further Notes

The motivating alternative was historical profit factor, but that requires enough completed historical trades or a true historical options backtest dataset. Expected Move Cushion is the chosen current-chain alternative because it can be computed honestly from data the app already has.

The first release should make the metric inspectable before it becomes influential. The table column lets the user compare candidates and develop trust in the value while preserving the existing score and candidate ordering model.

The implementation should keep the domain language consistent: this is **Expected Move Cushion**, not profit factor, breakeven cushion, or cushion score.
