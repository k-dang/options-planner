Status: ready-for-agent

## What to build

Add **Expected Move Cushion** as an end-to-end Risk/Reward Candidate metric.

The completed slice should compute the signed expected-move multiple from current candidate data, expose it on candidate summary data, keep it out of candidate score, and render it as a sortable column wherever the shared Risk/Reward Candidate table appears. The user should be able to scan single-symbol and Ticker Watchlist candidates and compare final values like `+1.4x`, `-0.6x`, or `n/a`.

The metric is signed distance to nearest adverse breakeven divided by expected move. Expected move comes from current underlying price, average option-leg implied volatility, and effective days to expiration using a one-day floor. Signed direction follows the strategy template's profitable range semantics.

## Acceptance criteria

- [ ] Risk/Reward Candidate summary data includes Expected Move Cushion as a nullable numeric value.
- [ ] Expected Move Cushion uses signed distance to nearest adverse breakeven divided by expected move.
- [ ] Expected move is computed from current underlying price, average option-leg implied volatility, and `sqrt(max(DTE, 1) / 365)`.
- [ ] Profitable range `above` candidates produce positive values when current price is above breakeven and negative values when below breakeven.
- [ ] Profitable range `below` candidates produce positive values when current price is below breakeven and negative values when above breakeven.
- [ ] Profitable range `between` candidates produce positive distance to the nearer breakeven when current price is inside the range.
- [ ] Profitable range `between` candidates produce negative distance back to the nearest breakeven when current price is outside the range.
- [ ] Candidates with missing breakevens, no option legs, unusable implied volatility, unusable DTE, or unusable expected move return `null` rather than `0`.
- [ ] Zero-DTE candidates use a one-day floor for expected-move annualization.
- [ ] Candidate score is unchanged and does not consume Expected Move Cushion.
- [ ] The shared Risk/Reward Candidate table shows an Expected Move Cushion column in both single-symbol and ticker-visible modes.
- [ ] Positive table values render with an explicit plus sign and `x` suffix.
- [ ] Negative table values render with a minus sign and `x` suffix.
- [ ] Unavailable table values render as muted `n/a`.
- [ ] Expected Move Cushion is sortable from the shared candidate table.
- [ ] Default sort direction for Expected Move Cushion is descending.
- [ ] Sorting orders numeric values by descending signed value and keeps unavailable values last.
- [ ] Domain tests cover signed `above`, `below`, and `between` profitable range behavior.
- [ ] Domain tests cover null behavior for uncomputable values.
- [ ] Domain tests cover the zero-DTE one-day floor.
- [ ] Tests verify Expected Move Cushion does not affect existing score behavior.
- [ ] Table or table-sort tests cover display formatting and unavailable-last sorting.

## Blocked by

None - can start immediately
