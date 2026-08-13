# Ticker watchlist

Watchlist stores underlyings for discovery. It is not the positions list. Adding a symbol does not create a saved strategy. Scans run only after the trader clicks Scan watchlist.

## Sub-features

- `watchlist-empty` shows `No watchlist symbols` when the list has no tickers.
- `watchlist-add` persists a symbol and shows it under Saved tickers.
- `watchlist-remove` deletes a symbol from the list.
- `watchlist-scan` runs shared criteria across saved tickers and fills the candidate table.

## How to get to it (user POV)

- Choose `Watchlist` in the nav.
- Open `/watchlist` directly.

## Driving it with agent-browser

Preconditions:

- Doctor is green and `watchlistReachable` is true.
- Add, remove, and scan-that-you-created-data require `mutationsAllowed: true` on a disposable database. A read-only visit of whatever is already in the shared DB is allowed. Do not add or remove symbols on the trader's database.

- **Open page.** Run `agent-browser open http://127.0.0.1:3100/watchlist`. Heading `Watchlist` and kicker `Ticker Watchlist` are visible. Either `No watchlist symbols` or a Saved tickers list is visible. `Scan watchlist` is disabled when the list is empty.
- **Add (mutations only).** Type `AAPL` in textbox `Symbol` and click `Add`. The list shows `AAPL` and a `Remove AAPL` button. Reload `/watchlist`. AAPL is still there.
- **Scan (mutations or existing symbols).** Set criteria if needed, then click `Scan watchlist`. Metrics `Symbols scanned`, `Candidates`, and `Failures` appear. A candidate table or `No candidates found` follows. Failures list tickers in a `Failed symbols` region.
- **Remove (mutations only, and only a symbol this run added).** Click `Remove AAPL`. The row is gone after reload.
- **Proof.** For a read-only pass, screenshot the loaded Watchlist heading plus empty state or Saved tickers. For a mutation pass, screenshot before add, after add, after reload, and after remove. Save under `artifacts/watchlist/`.

## Gotchas

- Scan criteria reset to 30-60 DTE and 25% PoP every time the page opens.
- `Scan watchlist` fetches a chain per saved symbol. On generated data this is local and fast. On Alpaca it hits the network. This verify instance must stay on generated chains.
- Adding a duplicate or invalid symbol shows an error under the form and must not duplicate the row.
- Never prove watchlist by inserting rows with a SQL client.
