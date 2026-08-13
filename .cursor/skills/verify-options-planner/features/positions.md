# Saved strategy positions

Positions lists paper trades saved from Builder. Open rows still mark to market. Closed and Expired rows contribute Realized P&L. This list is not the ticker watchlist.

## Sub-features

- `positions-empty` shows `No saved strategies` when nothing is saved.
- `positions-list` shows open rows with Name, Total Return, Status, and actions.
- `positions-open-builder` activates a row and loads Builder with saved-position context.
- `positions-close-delete` closes at the market mark or deletes after confirm. Skip unless mutations are allowed.

## How to get to it (user POV)

- Choose `Positions` in the nav.
- Open `/positions` directly.
- After a successful Save strategy, go to Positions to confirm the new row.

## Driving it with agent-browser

Preconditions:

- Doctor is green and `watchlistReachable` is true. Positions uses the same database.
- Close, delete, refresh, and auto refresh require `mutationsAllowed: true` on a disposable database. Read-only inspection of existing rows is allowed. Do not close or delete the trader's strategies.

- **Open page.** Run `agent-browser open http://127.0.0.1:3100/positions`. Heading `Positions` and kicker `Saved Strategies` are visible. Empty copy is `No saved strategies`. A populated page shows `Realized P&L` and `Refresh all`.
- **Open builder.** If a row exists, activate the row named by `View position in builder`. Builder shows `Options Planner · Builder` and a saved-position banner when `positionId` is in the URL.
- **Show realized.** If `Show realized (N)` is present, click it. Realized rows appear. Click `Hide realized` to return.
- **Close or delete (mutations only, and only a strategy this run saved).** `Close at market mark` moves the row to realized. `Delete strategy` opens `Delete saved strategy?`. Confirm with `Delete`. Reload Positions. The row is gone.
- **Proof.** Screenshot empty or populated Positions under `artifacts/positions/`. A save proof must include the Builder save status and the Positions row after reload.

## Gotchas

- Row click navigates. Action buttons sit in a cell that stops that navigation. Use the labeled `Refresh mark`, `Close at market mark`, and `Delete strategy` buttons, not the row, for those actions.
- Expired is a lifecycle state, not a loss. An expired short-premium trade can show positive Realized P&L.
- `Refresh all` and `Auto refresh` mark open strategies again. Skip them on the shared database.
- Dev-only skeleton toggle exists when `NODE_ENV` is development. Ignore it. It is not a user feature.
