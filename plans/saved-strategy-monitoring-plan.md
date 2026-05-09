# Plan: Saved Strategy Monitoring

> Source PRD: `plans/saved-strategy-monitoring-prd.md`

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: saved strategy monitoring is centered on `/positions`; saving starts from Builder routes only.
- **Persistence**: use Postgres with Drizzle migrations.
- **Authentication**: first version is single-user with no auth or user ownership.
- **Saved strategy model**: persisted strategies store name, symbol, strategy type, status, immutable entry state, immutable entry evaluation, signed entry mark value, capital at risk, created timestamp, and optional closed timestamp.
- **Snapshot model**: persisted snapshots store strategy id, snapshot type, observed timestamp, underlying price, signed mark value, unrealized P/L, return on risk, per-leg mark metadata, and quote source.
- **Snapshot types**: `entry`, `mark`, and `close`.
- **Refresh behavior**: manual only. Loading `/positions` reads database state and does not call market data APIs.
- **Return behavior**: Total Return is latest signed mark value minus entry signed mark value. Percentage return uses capital at risk when defined.
- **Quote behavior**: option marks use bid/ask mid first, then last price, then model fallback.
- **Status behavior**: saved strategies can be `open`, `closed`, or `expired`; closed strategies are not monitored further.
- **UI scope**: first version is table-only. No return history chart and no Today's Return column.

---

## Phase 1: Persistence Backbone

**User stories**: 38, 39, 42

### What to build

Introduce the deployable persistence foundation for saved strategy monitoring. The app should be able to connect to Postgres, run Drizzle migrations, and represent saved strategies plus timestamped snapshots in the database without changing the existing Builder or Optimizer flows yet.

### Acceptance criteria

- [ ] The app has a Postgres-backed Drizzle setup that can be configured with `DATABASE_URL`.
- [ ] The database schema supports saved strategies and strategy snapshots.
- [ ] Saved strategy status, snapshot type, strategy entry JSON, entry evaluation JSON, and per-leg mark JSON are represented in the schema.
- [ ] A migration can create the required tables from a clean database.
- [ ] Existing tests, linting, and typechecking continue to pass.

---

## Phase 2: Save From Builder

**User stories**: 1, 2, 3, 4, 5, 6, 24, 25, 26, 27, 28, 29, 40, 41

### What to build

Add the first end-to-end save path from Builder to database. A user with a valid Builder strategy can save it, receive a generated readable name, and create a persisted saved strategy with an immutable entry snapshot. The entry snapshot anchors future return calculations to the prices available when the user chose to save.

### Acceptance criteria

- [ ] Builder exposes a save action only when the current strategy is valid.
- [ ] Saving persists the current strategy state and entry evaluation without mutating the existing Builder behavior.
- [ ] Saving generates a readable default name from symbol, expiration, strikes, and strategy label.
- [ ] Saving calculates signed entry mark value consistently across long and short option/stock legs.
- [ ] Saving calculates capital at risk for finite-risk strategies, covered calls, and cash-secured puts.
- [ ] Undefined-risk strategies persist without a misleading percentage return basis.
- [ ] Saving creates an `entry` snapshot with zero P/L and zero return.
- [ ] Save operations run server-side so database writes and market data credentials are not exposed to the client.
- [ ] Unit tests cover name generation, signed entry marks, and capital-at-risk behavior.

---

## Phase 3: Positions Table

**User stories**: 8, 9, 10, 11, 12, 13, 14, 15, 16, 36

### What to build

Add `/positions` as the first saved-strategy monitoring screen. The page reads saved strategies and latest snapshots from the database and renders a table focused on the user’s core monitoring needs: name, total return, created timestamp, days until expiration, status, and actions placeholder. Page load must not refresh market data.

### Acceptance criteria

- [ ] `/positions` renders saved strategies from the database.
- [ ] Navigation includes an entry point to `/positions`.
- [ ] The table shows saved strategy name, Total Return, Created At, Days Until Expiration, and status.
- [ ] Total Return uses the latest saved snapshot against the immutable entry mark.
- [ ] Total Return shows dollar P/L and percentage return when capital at risk exists.
- [ ] Undefined-risk strategies show dollar P/L without a misleading percentage return.
- [ ] Open, closed, and expired strategies are visually distinguishable.
- [ ] Empty state explains that saved strategies will appear after saving from Builder.
- [ ] Loading the page does not call option market data APIs.

---

## Phase 4: Manual Refresh

**User stories**: 17, 19, 20, 21, 22, 23, 24, 25, 26, 40, 41

### What to build

Make saved strategy monitoring live through explicit user action. A user can refresh an open saved strategy from the positions table. Refresh fetches current market data, matches saved option legs by symbol, expiration, strike, and option type, calculates a new signed mark, stores a timestamped `mark` snapshot, and updates Total Return.

### Acceptance criteria

- [ ] Each open row has a manual refresh action.
- [ ] Refreshing a row does not refresh unrelated rows.
- [ ] Refresh creates a new `mark` snapshot instead of mutating entry data.
- [ ] Current option marks prefer bid/ask mid, then last price, then model fallback.
- [ ] Per-leg mark metadata records enough source information to debug the mark.
- [ ] Latest mark value, unrealized P/L, and return on risk are calculated consistently from signed leg marks.
- [ ] Refresh failures are surfaced without corrupting saved strategy data.
- [ ] Closed strategies cannot be refreshed.
- [ ] Unit tests cover quote preference order, signed current marks, and P/L calculation.

---

## Phase 5: Table Management And Polish

**User stories**: 7, 18, 30, 31, 32, 33, 34, 35

### What to build

Complete the table management workflow. A user can rename saved strategies, close an open strategy at the latest available market mark, delete unwanted saved strategies, and optionally refresh all open rows if still useful after row-level refresh is working. The table should handle normal action states clearly without expanding the feature into charts or portfolio analytics.

### Acceptance criteria

- [ ] Saved strategy names can be edited after creation.
- [ ] Closing an open strategy uses the latest available market mark and creates a `close` snapshot.
- [ ] Closed strategies remain visible with stable final return.
- [ ] Closed strategies are not eligible for further refresh.
- [ ] Deleting a saved strategy removes its snapshots and removes the row from the table.
- [ ] Destructive actions require clear user intent.
- [ ] Row action loading and error states are visible and do not shift the table layout incoherently.
- [ ] If included, page-level refresh only refreshes eligible open rows and reports partial failures clearly.
- [ ] Tests cover close status transitions, close snapshot creation, rename behavior, and delete cascading behavior.
