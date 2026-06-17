# Options Planner

Options Planner is a single-user options strategy planning context for discovering, modeling, and monitoring US equity options trade ideas.

## Language

**Ticker Watchlist**:
A collection of underlying symbols the trader wants to scan for new options strategy candidates.
_Avoid_: Saved strategy watchlist, positions watchlist

**Watchlist Symbol**:
A persisted underlying symbol that belongs to the ticker watchlist.
_Avoid_: Position, saved trade

**Saved Strategy**:
A paper trade captured from the Builder with immutable entry state and later mark snapshots.
_Avoid_: Ticker watchlist item

**Expired**:
A terminal state of a Saved Strategy reached when its options pass expiration, settling at intrinsic value; distinct from a manually Closed strategy and carrying no implication of loss (options expiring worthless can be the winning outcome).
_Avoid_: Closed, dead, lapsed

**Settlement Value**:
The signed value a Saved Strategy's legs are worth at expiration, computed as the intrinsic value of each option leg (and underlying value of stock legs) against the underlying price at expiration.
_Avoid_: Final mark, expiry mark, settlement mark

**Realized P&L**:
The final, locked-in gain or loss of a terminal Saved Strategy — whether Closed or Expired — measured against its entry value.
_Avoid_: Closed P&L, booked profit

**Unrealized P&L**:
The marked-to-market gain or loss of an open Saved Strategy, which still changes with each mark snapshot.
_Avoid_: Paper P&L, floating P&L

**Risk/Reward Candidate**:
A strategy setup produced by scanning an option chain for a ticker against the trader's filters.
_Avoid_: Position, saved trade

**Watchlist Scan Result**:
The combined set of risk/reward candidates produced by scanning all watchlist symbols.
_Avoid_: Per-ticker result table

**Watchlist Scan Criteria**:
The shared filters applied to every symbol in a ticker watchlist scan.
_Avoid_: Per-symbol filters

## Relationships

- A **Ticker Watchlist** contains one or more **Watchlist Symbols**.
- A **Ticker Watchlist** is managed from the watchlist page in the first version.
- A **Ticker Watchlist** produces zero or more **Risk/Reward Candidates** per symbol.
- A **Watchlist Scan Result** combines the top ten candidates from every scanned **Watchlist Symbol** into one comparable table.
- A **Watchlist Scan Result** may be partial when one or more symbols fail to scan.
- A **Watchlist Symbol** is persisted in the database so the ticker list survives browser and device changes.
- A **Ticker Watchlist** is scanned only when the trader explicitly asks for a scan.
- A **Ticker Watchlist** applies one shared set of **Watchlist Scan Criteria** to every **Watchlist Symbol**.
- **Watchlist Scan Criteria** reset to default scanner values when the page is opened.
- A **Ticker Watchlist** uses the same option-chain provider path as the single-symbol scanner.
- A **Saved Strategy** may originate from a **Risk/Reward Candidate**, but it is not part of the **Ticker Watchlist**.
- A selected **Risk/Reward Candidate** opens in the Builder for detailed modeling.
- A **Saved Strategy** is open until it becomes terminal by being either Closed (the trader closes it at the market mark) or **Expired** (its options pass expiration).
- An **Expired** Saved Strategy is settled once, at its **Settlement Value**, and is never marked again.
- A terminal Saved Strategy contributes its **Realized P&L** to the positions scorecard, whether it is Closed or **Expired**.

## Example Dialogue

> **Dev:** "Should adding AAPL to the **Ticker Watchlist** create a **Saved Strategy**?"
> **Domain expert:** "No. It only makes AAPL eligible for scanning. A **Saved Strategy** exists after I choose and save a specific setup."

## Flagged Ambiguities

- "watchlist" was used for both saved paper trades and ticker-level discovery. Resolved: use **Ticker Watchlist** for scanned underlyings and **Saved Strategy** for monitored paper trades.
- "expired" was read as a loss. Resolved: **Expired** is a lifecycle state, not an outcome — an expired strategy may have positive **Realized P&L** (e.g. a short-premium strategy whose options expire worthless).
