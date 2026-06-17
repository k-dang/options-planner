# Expiry settlement uses the latest underlying price, frozen once

When a Saved Strategy passes expiration, the refresh path settles it to its
Settlement Value (intrinsic value of every leg) using the **latest underlying
price available at detection**, not the official close on the expiration date.
The settlement snapshot is computed **once** and never recomputed — settling is
a one-shot transition to the `expired` state, not an ongoing mark.

We chose this over fetching the historical expiration-day close because the
latter would require a new historical daily-bars integration with the provider
(the current chain path only exposes a current underlying price), for a marginal
accuracy gain in a single-user paper-trading context. The auto-refresh workflow
already runs periodically, so an expiry detected within the expiry weekend lands
on the expiration Friday's close anyway.

## Consequences

- Settlement accuracy degrades if detection lags well past expiration (e.g.
  auto-refresh is off and the trader doesn't manually refresh for several
  trading days), because the "latest" price will have drifted from the true
  settlement price. This is accepted.
- Because settlement is frozen on first write, a drifted value cannot be
  silently corrected later — recomputing would only make it more wrong under
  this rule. Revisiting accuracy means switching to the historical close
  (supersede this ADR), not patching the freeze.
