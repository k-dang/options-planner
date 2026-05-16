# Plan: Ticker Watchlist

> Source PRD: [ticker-watchlist-prd.md](./ticker-watchlist-prd.md)

## Architectural Decisions

Durable decisions that apply across all phases:

- **Routes**: Add a new top-level `/watchlist` route for ticker-level discovery. Keep `/positions` for saved strategy monitoring and `/scan` for single-symbol scanning.
- **Schema**: Add a persisted watchlist symbol table in the existing Postgres/Drizzle schema. Store normalized uppercase symbols, creation time, and any stable display ordering needed for the watchlist.
- **Key models**: Use **Ticker Watchlist**, **Watchlist Symbol**, **Watchlist Scan Criteria**, **Risk/Reward Candidate**, and **Watchlist Scan Result** as the feature language.
- **Persistence**: Persist watchlist symbols in the database. Do not use browser-local storage for the watchlist.
- **Authentication**: Keep the first version single-user. Do not add user ownership yet, but avoid schema choices that would make ownership hard to add later.
- **Provider boundary**: Use the same option-chain provider path as the existing single-symbol scanner. Generated-provider and live-provider behavior should remain consistent across `/scan` and `/watchlist`.
- **Scan behavior**: Opening the page must not fetch option chains. Scans run only after an explicit user action.
- **Criteria behavior**: Use one shared scan criteria set for every watchlist symbol. Criteria reset to scanner defaults when the page opens and are not persisted in v1.
- **Result shape**: Keep the top ten candidates per ticker, then combine successful ticker results into one comparable table.
- **Failure model**: A scan may return partial results. Per-symbol failures should not fail the entire scan and must not mutate the saved watchlist.
- **Navigation**: Selecting a risk/reward candidate opens the Builder for that exact candidate.

---

## Phase 1: Persisted Watchlist Shell

**User stories**: 1-9, 30, 34, 36

### What To Build

Create the first complete watchlist path: a `/watchlist` page that appears in navigation, loads persisted watchlist symbols from the database, and lets the user add or remove symbols from that page. This phase proves the new Ticker Watchlist concept end to end without scanning market data.

### Acceptance Criteria

- [ ] `/watchlist` is available as a top-level page and is reachable from the primary navigation.
- [ ] The page clearly represents a ticker watchlist, not saved strategies or positions.
- [ ] Watchlist symbols are stored in Postgres through the existing Drizzle setup.
- [ ] Adding a ticker persists a normalized uppercase symbol.
- [ ] Duplicate symbols are prevented.
- [ ] Removing a ticker deletes it from the persisted watchlist.
- [ ] Reloading the page shows the persisted symbol list.
- [ ] The page has useful empty states for a new watchlist.
- [ ] Opening the page does not fetch option chains or run a risk/reward scan.
- [ ] Persistence behavior is covered by focused tests or integration-style coverage.

---

## Phase 2: Manual Multi-Ticker Scan

**User stories**: 10-13, 17-19, 23-25, 31-33, 35

### What To Build

Add the manual scan action and a watchlist scan module that runs the existing risk/reward candidate generation across all saved symbols. The scan should use default shared criteria, keep the top ten candidates per ticker, combine successful candidates into one table-ready result set, and return per-symbol failures separately.

### Acceptance Criteria

- [ ] The watchlist page includes an explicit scan action.
- [ ] No scan runs until the user starts one.
- [ ] The scan uses the same option-chain provider path as the single-symbol scanner.
- [ ] The scan applies one shared default criteria set to every saved symbol.
- [ ] Each successful ticker contributes at most ten candidates.
- [ ] Successful candidates from all tickers are combined into one result set.
- [ ] Every candidate includes its ticker symbol.
- [ ] A failure for one ticker does not prevent successful results from other tickers from rendering.
- [ ] Failed symbols are shown separately from the candidate table.
- [ ] Scan failures do not add, remove, or mutate watchlist symbols.
- [ ] The scan module is testable independently of the UI.
- [ ] Tests cover top-ten selection, combined result shaping, and partial failure behavior.

---

## Phase 3: Shared Criteria Controls

**User stories**: 14-16, 21

### What To Build

Expose scanner-style controls on the watchlist page so the user can adjust the shared criteria before running a scan. The controls should mirror the useful behavior from the single-symbol scanner while applying to every saved symbol in the watchlist.

### Acceptance Criteria

- [ ] The page exposes days-to-expiration controls for the watchlist scan.
- [ ] The page exposes minimum probability-of-profit controls for the watchlist scan.
- [ ] The page exposes enabled strategy-family controls for the watchlist scan.
- [ ] Criteria changes apply to every watchlist symbol.
- [ ] Criteria reset to scanner defaults when the page opens.
- [ ] Criteria are not persisted in v1.
- [ ] The combined result table supports useful sorting across all candidates.
- [ ] Tests cover applying non-default criteria across multiple symbols.

---

## Phase 4: Builder Handoff and Polish

**User stories**: 20, 22, 26-29

### What To Build

Bring the combined results table up to the expected Risk/Reward comparison quality and complete the handoff into Builder. The page should make scan scope, result counts, empty states, and failures clear enough for regular use.

### Acceptance Criteria

- [ ] The combined table includes the core Risk/Reward columns needed to compare candidates across tickers.
- [ ] The table includes ticker, strategy, expiration, strikes, score, max profit, max loss, return on risk, and probability of profit where available.
- [ ] Result counts make clear how many symbols and candidates were scanned.
- [ ] Empty states cover no scan run, no symbols, no candidates, and partial failure cases.
- [ ] Selecting a candidate opens the Builder for the exact strategy setup.
- [ ] Builder links preserve the same strategy state that the single-symbol scanner would open.
- [ ] Existing scan and builder behavior remain unchanged.
- [ ] Page-level tests or workflow coverage verify candidate-to-Builder navigation.
