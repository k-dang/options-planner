# Build a strategy

Builder models one template on a generated chain. It shows max profit, max loss, probability of profit, net premium, breakevens, and a payoff chart. Export copies Markdown or JSON. Save strategy writes a paper trade to Positions.

## Sub-features

- `builder-open` loads a template URL and shows the strategy heading plus generated provider badge.
- `builder-metrics` shows Max profit, Max loss, Prob. of profit, and Payoff Analysis.
- `builder-export` copies Markdown or JSON and toasts success.
- `builder-save` persists to Positions. Skip unless mutations are allowed.

## How to get to it (user POV)

- Choose `Inspect top match`, `Open in Builder`, or `Review uncapped risk` from Optimizer.
- Choose `Open` on a Scan or watchlist candidate row.
- Open `/build/bull-call-spread/AAPL` directly.
- `/build` with no strategy redirects home.

## Driving it with agent-browser

Preconditions:

- Doctor is green at `http://127.0.0.1:3100`.
- Chain provider is generated.

- **Open template.** Run `agent-browser open http://127.0.0.1:3100/build/bull-call-spread/AAPL`. Header includes `Options Planner · Builder`. Heading is `Bull Call Spread`. Price shows `$172` with badge `generated`. Buttons `Export` and `Save strategy` are enabled.
- **Metrics.** Confirm tiles `Max profit`, `Max loss`, `Prob. of profit`, and heading `Payoff Analysis`.
- **Export Markdown.** Click `Export`, then `Copy as Markdown`. A toast reads `Markdown copied`.
- **Save.** Only if doctor `mutationsAllowed` is true. Click `Save strategy`. Status text starts with `Saved as`. Then open Positions and find that name. If mutations are not allowed, record the skip. Do not click Save against the shared database.
- **Proof.** Snapshot and screenshot the loaded Bull Call Spread under `artifacts/builder/`. The files must show the heading, generated badge, and Payoff Analysis.

## Gotchas

- `/build` redirects to `/`. Always include strategy and symbol in the path.
- Changing Symbol navigates to `/build/<same-strategy>/<new-symbol>` and rebuilds strikes from that chain.
- Export proof needs the toast. Clipboard contents are not visible in the snapshot.
- Save talks to Neon. A green Save status is incomplete until `/positions` lists the row.
- Uncapped templates show Max loss as `Unlimited`.
