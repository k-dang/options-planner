---
name: verify-options-planner
description: Drive the Options Planner Next.js web UI in a browser to prove optimizer, scanner, builder, watchlist, and positions behavior against a locally launched instance. Use when a change needs a real user-path proof, not unit tests.
---

# Verify Options Planner

Options Planner is a single-user Next.js web app. Traders model US equity options ideas in the browser. There is no CLI and no login.

Primary surface is the web UI. Secondary is `GET /api/tickers/search?q=`, used only by the Symbol combobox. Vitest coverage is not a substitute for this skill.

## Isolate first

The user's everyday `pnpm dev` is `http://localhost:3000`. Never drive that URL. It shares the same Neon `DATABASE_URL` and may already have the trader's watchlist and saved strategies loaded.

This skill launches a second Next process on `127.0.0.1:3100` with `OPTION_CHAIN_PROVIDER=generated` and `OPTIONS_PLANNER_DIST_DIR=.next-verify`. Next.js 16 refuses a second `next dev` that shares `.next`. The verify distDir is how this instance sits beside the user's `:3000` server. Never kill that other process.

Generated AAPL last is `$172.00`. Bullish default target is `$185.76`. Bearish default target is `$158.24`.

Watchlist add/remove, builder Save strategy, and positions refresh/close/delete all write through `DATABASE_URL`. Launch inherits that URL from `.env.local`. Do not run those actions unless doctor reports `mutationsAllowed: true`, which requires `OPTIONS_PLANNER_VERIFY_MUTATIONS=1` at launch, and the database is disposable. Optimizer, Scan, and Builder (except Save) do not need a database.

If port 3100 is busy, set `OPTIONS_PLANNER_VERIFY_PORT` and relaunch. Do not steal 3000.

## Launch

From the repo root:

```bash
node .cursor/skills/verify-options-planner/scripts/launch.mjs
```

Ready means the process printed JSON with `"ok": true` and `GET http://127.0.0.1:3100/optimize?symbol=AAPL` returns HTML containing `Strategy Optimizer`. First compile can take over a minute. On Unix, logs go to `.cursor/skills/verify-options-planner/run/next.log`. On Windows, Start-Process cannot redirect those streams without blocking, so doctor the HTTP endpoint instead of the log file.

If `node_modules/next` is missing, run `pnpm install` and launch again.

Teardown is Cleanup below, not `taskkill` by image name.

## Doctor

Run this first whenever anything looks off:

```bash
node .cursor/skills/verify-options-planner/scripts/doctor.mjs
```

Require `"ok": true`, `"url"` matching the launch instance, `"chainProvider": "generated"`, and `"identity": "Options Planner"`. If `watchlistReachable` is false, skip watchlist and positions proofs. If `mutationsAllowed` is false, skip every write path.

A 200 from `:3000` is not a pass.

## Drive

No Playwright suite exists. Drive the UI with `agent-browser` against the doctor URL. Load `agent-browser skills get core` if a flag in this file disagrees with the installed CLI.

```bash
agent-browser --session options-planner-verify open http://127.0.0.1:3100/optimize?symbol=AAPL
agent-browser --session options-planner-verify snapshot -i
agent-browser --session options-planner-verify --screenshot-dir .cursor/skills/verify-options-planner/artifacts/<feature> screenshot --full
```

The CLI prints `Screenshot saved to ...`. Copy that file into `artifacts/<feature>/` with a stable name. A positional screenshot path is ignored on Windows.

Stable clicks use the find command, not leftover `@e` refs:

```bash
agent-browser --session options-planner-verify find role button click --name Bearish
```

Prefer these handles, in this order:

| Handle | Where |
| --- | --- |
| link `Options Planner` | nav home |
| link `Optimizer`, `Scan`, `Watchlist`, `Positions` | nav |
| heading `Strategy Optimizer` | `/optimize` |
| heading `Risk/Reward Scanner` | `/scan` |
| heading `Watchlist` | `/watchlist` |
| heading `Positions` | `/positions` |
| textbox `Symbol` | ticker combobox |
| button `Bullish`, `Bearish`, `Income` | optimizer thesis. Snapshots may omit pressed state. Prove it from the target and featured card. |
| spinbutton `Target Price at Expiration` | optimizer, id `target-price` |
| button `Apply target price` | optimizer |
| slider `Rank by` | optimizer return/chance weight. Interactive snapshots often show this as an unnamed slider. |
| heading `Top-ranked match` | optimizer |
| button `Inspect top match` / `Open in Builder` / `Review uncapped risk` | optimizer strategy cards |
| slider `Days to expiration` | scan and watchlist scan |
| slider `Minimum probability of profit` | scan and watchlist scan |
| button `Select all`, `Clear`, plus strategy labels such as `Bull Call Spread` | scan criteria, `aria-pressed` when enabled |
| link `Open` | scan result row |
| button `Add` | watchlist |
| button `Remove AAPL` | watchlist, name includes the symbol |
| button `Scan watchlist` | watchlist |
| button `Save strategy`, `Export`, `Copy as Markdown`, `Copy as JSON` | builder |
| button `Refresh all`, `Auto refresh`, `Refresh mark`, `Close at market mark`, `Delete strategy` | positions |

Do not click by coordinates. After each action, snapshot again. `@e` refs from an older snapshot are stale. Close the session when the proof is done: `agent-browser --session options-planner-verify close`.

Direct routes that skip nav:

- `/optimize?symbol=AAPL`
- `/scan?symbol=MSFT`
- `/build/bull-call-spread/AAPL`
- `/watchlist`
- `/positions`

MSFT generated last is `$421`.

## Evidence

Write proof under `.cursor/skills/verify-options-planner/artifacts/<feature>/`. Cleanup must not delete that directory.

A pass needs the user action and the resulting state:

1. Screenshot or ARIA snapshot before the action, with Options Planner visible in the nav.
2. The click, fill, or navigation you ran.
3. Screenshot or ARIA snapshot after, showing the new heading, pressed thesis, candidate table, or saved-strategy copy.
4. For a write, a second read-only view of the same data. Saving from Builder is not proven until `/positions` lists the new row.

Exercise the real page. Do not call server actions from a script, and do not treat Vitest as UI proof. Generated chains are the production fallback when `OPTION_CHAIN_PROVIDER` is not `alpaca`. That is the intended verify provider, not a mock. Live Alpaca is out of scope here.

## Cleanup

```bash
node .cursor/skills/verify-options-planner/scripts/cleanup.mjs
```

Kills only the pid recorded in `run/instance.json`, including its child tree on Windows. Removes `run/instance.json` and `run/next.log`. Leaves `artifacts/` in place.

If launch fails halfway, run cleanup before the next attempt so port 3100 is not stranded.

## Helpers

All paths are from the repo root.

```bash
node .cursor/skills/verify-options-planner/scripts/launch.mjs
node .cursor/skills/verify-options-planner/scripts/doctor.mjs
node .cursor/skills/verify-options-planner/scripts/cleanup.mjs
```

`launch.mjs` records pid, url, and `chainProvider` in `run/instance.json`. `doctor.mjs` refuses to pass without that file and a live pid. There is no `drive` helper. Browser steps live in `features/`.
