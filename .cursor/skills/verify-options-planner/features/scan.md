# Scan risk/reward

Scan lists risk/reward candidates for one symbol using shared days-to-expiration, minimum probability of profit, and enabled strategy families. Choosing Open loads that setup in Builder.

## Sub-features

- `scan-open` shows Risk/Reward Scanner for AAPL with a candidate table and a setups count.
- `scan-filter-strategy` toggling a strategy chip changes the table.
- `scan-empty` raising filters until nothing matches shows `No setups match`.
- `scan-open-builder` Open on a row loads Builder for that candidate.

## How to get to it (user POV)

- Choose `Scan` in the nav.
- Open `/scan` or `/scan?symbol=AAPL` directly.

## Driving it with agent-browser

Preconditions:

- Doctor is green at `http://127.0.0.1:3100`.
- Chain provider is generated.

- **Open scanner.** Run `agent-browser open http://127.0.0.1:3100/scan?symbol=AAPL`. Heading `Risk/Reward Scanner` is visible. Last price is `$172.00`. Default chips pressed include `Bull Call Spread`, `Bear Put Spread`, `Bull Put Spread`, `Bear Call Spread`, and `Iron Condor`. The table has Strategy, Expiration, Score, and Expected Move Cushion columns. The header reports `N setups` with N greater than 0.
- **Disable a family.** Click `Iron Condor` so `aria-pressed` is false. Setup count drops or the Iron Condor rows disappear.
- **Empty state.** Click `Clear`, then enable only `Short Straddle`, and drag `Minimum probability of profit` to `90%`. After the table refreshes, the page shows `No setups match`.
- **Open builder.** Reset by reloading `/scan?symbol=AAPL`. Click `Open` on the first row. Builder heading matches that row's strategy label.
- **Proof.** Save snapshot and screenshot of the populated table under `artifacts/scan/`. The files must show Options Planner, `Risk/Reward Scanner`, and at least one `Open` link.

## Gotchas

- Filters are client-side on the already loaded chain. There is no Scan submit button on this page. `Scan watchlist` is a different control on `/watchlist`.
- Default DTE is 30-60 and default min PoP is 25%.
- `Clear` turns off every strategy and yields no setups even before touching PoP.
- Symbol changes navigate and reset filters.
- Expected Move Cushion sorts unavailable values last. Do not assert row 1 by that column unless you just sorted it.
