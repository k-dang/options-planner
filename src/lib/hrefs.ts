import type { StrategyState } from "@/lib/options/types";

export function scanSymbolHref(symbolValue: string, fallbackSymbol = "AAPL") {
  const symbol = symbolValue.trim().toUpperCase() || fallbackSymbol;

  return `/scan?symbol=${encodeURIComponent(symbol)}`;
}

export function optimizeSymbolHref(
  symbolValue: string,
  fallbackSymbol = "AAPL",
) {
  const symbol = symbolValue.trim().toUpperCase() || fallbackSymbol;

  return `/optimize?symbol=${encodeURIComponent(symbol)}`;
}

export function builderStrategyHref(strategy: string, symbol: string) {
  return `/build/${encodeURIComponent(strategy)}/${encodeURIComponent(symbol)}`;
}

export function strategyBuilderHref(state: StrategyState) {
  const optionLegs = state.legs.filter((leg) => leg.kind === "option");
  const firstLeg = optionLegs[0];
  const secondLeg = optionLegs[1];
  const params = new URLSearchParams();

  if (firstLeg) {
    params.set("exp", firstLeg.expiration);
    params.set("strike", String(firstLeg.strike));
    params.set("qty", String(firstLeg.quantity));
  }

  if (secondLeg) {
    params.set("strike2", String(secondLeg.strike));
  }

  for (const [index, leg] of optionLegs.slice(2).entries()) {
    params.set(`strike${index + 3}`, String(leg.strike));
  }

  const query = params.toString();
  const path = builderStrategyHref(state.strategy, state.symbol);

  return query ? `${path}?${query}` : path;
}
