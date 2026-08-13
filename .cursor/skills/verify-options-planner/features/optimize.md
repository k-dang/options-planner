# Optimize a symbol

The optimizer loads a generated option chain for a symbol, ranks strategies for a thesis and target price at expiration, and offers the top match in Builder.

## Sub-features

- `optimize-open` shows Strategy Optimizer with AAPL last `$172.00` and Options chain Generated.
- `optimize-thesis` switches Bullish, Bearish, and Income and updates the applied target.
- `optimize-target` edits Target Price at Expiration and applies it before rankings change.
- `optimize-open-builder` opens the featured card in Builder.

## How to get to it (user POV)

- Choose `Optimizer` in the nav.
- Choose `Open optimizer` on the home page.
- Open `/optimize` or `/optimize?symbol=AAPL` directly.

## Driving it with agent-browser

Preconditions:

- Doctor is green at `http://127.0.0.1:3100`.
- Chain provider is generated.

- **Nav entry.** Choose `Optimizer`. Run `agent-browser --session options-planner-verify open http://127.0.0.1:3100/optimize?symbol=AAPL`. Heading `Strategy Optimizer` is visible. Combobox `Symbol` reads `AAPL`. Target spinbutton is about `185.76`. Heading `Top-ranked match` is visible. On generated AAPL the featured card is `Short Put` with `Inspect top match`.
- **Thesis.** Choose `Bearish`. Run `agent-browser --session options-planner-verify find role button click --name Bearish`. Target spinbutton becomes about `158.24`. Featured card becomes `Short Call` with `Review uncapped risk`. Other strategies include `Long Put` and `Bear Call Spread`.
- **Target apply.** Replace the target with `180` and choose `Apply`. Run `agent-browser --session options-planner-verify fill "Target Price at Expiration" 180` then `find role button click --name "Apply target price"`. Rankings and the Target legend use `$180.00`. The help line says the value is applied.
- **Open builder.** Choose `Inspect top match` or `Review uncapped risk` on the featured card. The next page heading is a strategy label such as `Short Call`, with `Options Planner · Builder` in the header.
- **Proof.** Snapshot and screenshot the Bearish ranked state. Redirect `snapshot -i` to `artifacts/optimize/02-bearish.aria.txt`. Take a full screenshot and copy the printed path to `artifacts/optimize/02-bearish.png`. The files must show Options Planner, `Top-ranked match`, and the new target/card.

## Gotchas

- Changing the Symbol combobox navigates to `/optimize?symbol=...` and remounts the page. Thesis resets to Bullish.
- Typing a target does nothing until Enter, blur, or `Apply`. The help line says `Not applied yet` while dirty.
- Featured card CTA is `Inspect top match` when risk is capped and `Review uncapped risk` when max loss is unlimited. Non-featured cards say `Open in Builder`.
- `agent-browser snapshot -i` does not show `aria-pressed` on the thesis buttons. Prove thesis from the target value and the featured card, not from pressed state.
- The target spinbutton often shows a float such as `185.7599945068359`. Assert with a round-to-cents check, not string equality.
- The Rank by control appears as an unnamed `slider` in the snapshot. Last price `$172.00` is visible on screen but not as its own labeled node in the interactive snapshot.
- Generated snapshot time is `Apr 24, 2026` in UTC. Do not treat that as live market data.
- Default expiration is the first chain expiry with at least 30 days to expiration (`May 24, 2026, 30 days out` on generated AAPL).
