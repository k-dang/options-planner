## Problem Statement

Options Planner can scan one ticker at a time through the Risk/Reward Scanner, but the user has no first-class way to maintain a persistent list of underlyings they care about and compare options strategy candidates across that list. This makes the discovery workflow repetitive: the user must remember tickers, visit each symbol individually, and mentally compare the best setups across separate scans.

The user wants a new ticker watchlist concept that is separate from saved strategy monitoring. The ticker watchlist should track underlying symbols, run the existing risk/reward scan across the list only when requested, and present the best candidates in one combined comparison table.

## Solution

Add a new ticker watchlist page for symbol-level opportunity discovery.

The page will let the user add and remove watchlist symbols, with the list persisted in Postgres through Drizzle. The page will load the saved symbols without automatically scanning market data. When the user manually starts a scan, the app will use the same option-chain provider path as the existing single-symbol scanner for each watchlist symbol, apply one shared set of scan criteria, keep the top ten candidates per ticker, and combine successful results into one sortable Risk/Reward table.

The watchlist scan should tolerate partial failure. If one ticker fails because of a bad symbol, sparse chain, provider error, or transient market data issue, the page should still show successful candidates for the rest of the watchlist and separately identify failed symbols. Selecting a candidate should open the Builder for that exact strategy setup, matching the existing scanner-to-builder workflow.

## User Stories

1. As an options trader, I want a ticker watchlist page, so that I can track underlyings I care about in one place.
2. As an options trader, I want the ticker watchlist to be separate from saved strategies, so that discovery symbols are not confused with paper trades I already chose.
3. As an options trader, I want watchlist symbols persisted in the database, so that my ticker list survives browser changes and page reloads.
4. As an options trader, I want to add a ticker from the watchlist page, so that I can expand my discovery universe without leaving the workflow.
5. As an options trader, I want ticker entry to reuse the existing ticker search behavior, so that adding symbols feels consistent with the rest of the app.
6. As an options trader, I want duplicate symbols prevented, so that my scan results are not repeated.
7. As an options trader, I want symbols normalized to uppercase, so that ticker storage and display are consistent.
8. As an options trader, I want to remove a ticker from the watchlist, so that stale or unwanted symbols do not keep appearing in scans.
9. As an options trader, I want the watchlist page to load without fetching option chains, so that opening the page does not unexpectedly call market data APIs.
10. As an options trader, I want to manually start the watchlist scan, so that I control when provider calls happen.
11. As an options trader, I want the watchlist scan to use the same option-chain provider path as the single-symbol scanner, so that results are consistent across pages.
12. As an options trader, I want one shared set of scan criteria applied to all watchlist symbols, so that candidates are comparable.
13. As an options trader, I want the watchlist scan criteria to reset to the scanner defaults when I open the page, so that filter preference persistence does not complicate the first version.
14. As an options trader, I want to adjust days-to-expiration criteria, so that watchlist candidates fit my target holding window.
15. As an options trader, I want to adjust minimum probability of profit, so that low-probability candidates can be excluded.
16. As an options trader, I want to enable or disable strategy families for the scan, so that the result set matches the types of trades I am willing to consider.
17. As an options trader, I want the scan to keep only the top ten candidates per ticker, so that a multi-symbol watchlist does not produce an overwhelming table.
18. As an options trader, I want one combined Risk/Reward table across all scanned symbols, so that I can compare the best opportunities in the watchlist directly.
19. As an options trader, I want each result row to include the ticker symbol, so that I can see which underlying produced the candidate.
20. As an options trader, I want the combined table to include the same core Risk/Reward columns as the single-symbol scanner, so that I do not need to learn a second comparison model.
21. As an options trader, I want to sort the combined table, so that I can rank candidates by score, return on risk, probability of profit, max profit, max loss, expiration, strategy, or ticker.
22. As an options trader, I want the page to show how many symbols and candidates were scanned, so that I understand the scope of the result set.
23. As an options trader, I want partial results when one ticker fails, so that one provider issue does not hide useful candidates for other symbols.
24. As an options trader, I want failed symbols shown separately from successful results, so that I know what did not scan and can retry or remove a symbol.
25. As an options trader, I want empty states for no watchlist symbols, no scan run, and no candidates found, so that the page is understandable in every state.
26. As an options trader, I want selecting a watchlist candidate to open the Builder for that exact setup, so that I can model and refine the trade.
27. As an options trader, I want the Builder link to preserve the same strategy state that the single-symbol scanner would open, so that watchlist candidates are not lossy.
28. As an options trader, I want scan results to remain on screen after a scan completes, so that I can inspect them before choosing a candidate.
29. As an options trader, I want scan errors to avoid destroying existing watchlist symbols, so that a provider problem does not mutate my saved list.
30. As an options trader, I want provider-specific freshness to be visible when available, so that I can judge whether generated or live data backed a result.
31. As a developer, I want ticker watchlist persistence isolated behind a small module, so that page code does not duplicate database details.
32. As a developer, I want watchlist scan orchestration isolated from UI code, so that provider fetching, partial failure handling, top-N selection, and result shaping are testable.
33. As a developer, I want the watchlist scanner to reuse the existing risk/reward scanning engine, so that candidate generation remains consistent with `/scan`.
34. As a developer, I want the watchlist page to preserve market data credentials on the server side, so that provider access is not exposed to the client.
35. As a developer, I want the database model to avoid overfitting to browser-local state, so that user ownership can be added later without rewriting the watchlist table.
36. As a developer, I want unit tests around scan result shaping and partial failure behavior, so that multi-ticker behavior stays stable as providers evolve.
37. As a developer, I want persistence tests or integration-style tests around adding, listing, and removing watchlist symbols, so that database behavior is covered.

## Implementation Decisions

- The feature introduces a new ticker watchlist concept, separate from saved strategies and positions.
- The ticker watchlist contains persisted watchlist symbols, not saved trades.
- Watchlist symbols are stored in Postgres through Drizzle.
- The first version remains single-user and does not require authentication or user ownership columns.
- The watchlist symbol table should use normalized uppercase symbols and prevent duplicate entries.
- Watchlist symbol records should include creation time, and may include sort order if useful for stable display.
- The watchlist page is the only place to add or remove symbols in v1.
- Cross-page "add to watchlist" actions from the scanner, optimizer, or builder are out of scope for v1.
- Opening the watchlist page lists persisted symbols but does not fetch option chains.
- A manual scan action triggers option-chain fetching for the current watchlist symbols.
- The watchlist scan uses the same option-chain provider registry path as `/scan`.
- In generated-provider mode, watchlist scans use deterministic generated chains just like the single-symbol scanner.
- In live-provider mode, watchlist scans may call the external provider once or more per ticker.
- The watchlist scan applies one shared filter set to every symbol.
- Shared filters use the existing scanner defaults in v1.
- Shared filters are not persisted in v1.
- The first version should support the same core filter concepts as `/scan`: days to expiration, minimum probability of profit, and enabled strategy families.
- The watchlist scan keeps the top ten candidates per ticker before combining results.
- The result view is one combined Risk/Reward table, not one table per ticker.
- The combined table must include a ticker column.
- Candidate rows should expose the same builder navigation behavior as the existing scanner.
- Partial scan results are supported.
- A ticker failure should produce a per-symbol error result without failing the entire scan.
- Failed symbols should be visible outside the candidate table.
- Failed scans must not add, remove, or mutate watchlist symbols.
- The page should be added to the primary navigation as a separate destination.
- The likely major modules are:
  - Database schema and migration for persisted watchlist symbols.
  - A watchlist persistence module for list, add, and remove operations.
  - A watchlist scan module that accepts symbols plus shared criteria and returns combined candidates plus per-symbol failures.
  - Server actions or route handlers for symbol mutations and manual scanning.
  - A watchlist page/client experience for symbol management, filters, scan action, errors, and the combined table.
  - Small shared table or result-formatting helpers if the existing scanner table logic can be extracted without overgeneralizing.
- The watchlist scan module should be a deep module with a narrow interface. It should hide provider fetching, candidate generation, top-N selection, partial failure handling, and result row shaping behind a single testable operation.
- UI code should not duplicate risk/reward math or candidate ranking logic.

## Testing Decisions

Good tests should verify external behavior and domain promises rather than component internals. The highest-value tests are around persistence, scan orchestration, top-N selection, partial failure handling, and builder-link preservation.

The watchlist persistence module should have tests or integration-style coverage for:

- Adding a normalized uppercase symbol.
- Preventing duplicate symbols.
- Listing symbols in stable order.
- Removing a symbol.
- Avoiding mutation when unrelated scan behavior fails.

The watchlist scan module should have deterministic unit tests for:

- Applying shared scan criteria to multiple symbols.
- Returning the top ten candidates per ticker.
- Combining successful ticker results into one result set.
- Including ticker identity on every candidate row.
- Preserving builder links from generated risk/reward candidates.
- Returning partial results when one provider call fails.
- Returning a useful empty result when no ticker produces candidates.

The page-level behavior should have lighter coverage focused on observable workflows:

- Empty watchlist state renders.
- Adding and removing symbols updates the displayed list.
- Manual scan is required before candidates are shown.
- Successful scans render a combined table.
- Partial failures render successful candidates plus failed symbol status.
- Candidate actions navigate to Builder.

Prior art exists in the codebase for deterministic options-domain tests around optimizer scanning, generated providers, provider normalization, strategy evaluation, and saved strategy monitoring. The watchlist scanner should follow that style: fixed inputs, mocked provider behavior where needed, no live network calls in tests, and assertions against returned domain objects.

## Out of Scope

- Saved strategy monitoring changes.
- Treating watchlist symbols as positions or paper trades.
- Direct save from watchlist candidates into saved strategies.
- Cross-page "add to watchlist" buttons.
- Authentication, user-specific ownership, teams, or shared watchlists.
- Browser-local watchlist persistence.
- Persisted filter preferences.
- Per-symbol scan filters.
- Automatic scan on page load.
- Scheduled watchlist scans.
- Alerts, notifications, thresholds, or emails.
- Historical scan result storage.
- Watchlist performance charts.
- Portfolio-level aggregation.
- Broker account integration or order execution.
- Provider-specific caching beyond the existing provider behavior.

## Further Notes

The term "watchlist" is overloaded in trading tools. In this product, the resolved language is **Ticker Watchlist** for scanned underlyings and **Saved Strategy** for monitored paper trades. The implementation and UI should preserve that distinction.

The first version should optimize for a trustworthy discovery loop: maintain a clean symbol list, scan only on request, compare the best candidates across symbols, and open promising setups in Builder. Broader convenience features should wait until the core multi-ticker scan workflow is stable.
