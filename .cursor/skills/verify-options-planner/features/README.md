# Options Planner verification map

This directory is the maintained source for verifying user-facing Options Planner behavior. Read this index, run doctor, then follow the matching feature file.

## Baseline preconditions

- Launch with `node .cursor/skills/verify-options-planner/scripts/launch.mjs`.
- Doctor must report `http://127.0.0.1:3100` (or the `OPTIONS_PLANNER_VERIFY_PORT` you set), `chainProvider: generated`, and identity Options Planner.
- Never open `http://localhost:3000`.
- Optimizer, Scan, and Builder modeling run on generated chains. AAPL last is `$172.00`. MSFT last is `$421`.
- Skip watchlist and positions if doctor reports `watchlistReachable: false`.
- Skip Save strategy, Add/Remove ticker, Refresh, Close, and Delete unless doctor reports `mutationsAllowed: true` on a disposable database.

## Driving conventions

- Start from the feature's preconditions, not leftover UI state from a previous proof.
- Use `agent-browser` against the doctor URL. Prefer role and accessible name over CSS or tab order.
- Treat quoted names as literal.
- Restore any mutated watchlist symbol or saved strategy you created. Keep the proof files.

## Proof and skip reporting

- Capture the action and the resulting state, not only the final screen.
- UI proof is an ARIA snapshot plus a screenshot that shows the Options Planner nav.
- A write is unproven until a second user-facing view shows the stored value.
- Record the feature id and the entry point used.
- If an entry point is unreachable, report the command and the unmet precondition. Do not count a different path as coverage for the skipped one.

## Feature entry contract

Each file starts with an H1 and one paragraph. Then exactly four H2 sections, in this order.

1. `Sub-features`
2. `How to get to it (user POV)`
3. `Driving it with agent-browser`
4. `Gotchas`

## Features

- [Optimize a symbol](./optimize.md) ranks generated-chain strategies for a thesis and target price, then opens the top match in Builder.
- [Scan risk/reward](./scan.md) lists candidates for one symbol under shared DTE, PoP, and strategy filters.
- [Build a strategy](./builder.md) loads a template, shows payoff metrics, and exports Markdown or JSON. Save is gated on mutations.
- [Ticker watchlist](./watchlist.md) persists underlyings and runs an on-demand multi-symbol scan. Writes are gated on mutations.
- [Saved strategy positions](./positions.md) lists paper trades, realized P&L, and close/delete. Writes are gated on mutations.
