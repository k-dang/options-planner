export function scanSymbolHref(symbolValue: string, fallbackSymbol = "AAPL") {
  const symbol = symbolValue.trim().toUpperCase() || fallbackSymbol;

  return `/scan?symbol=${encodeURIComponent(symbol)}`;
}

export function builderStrategyHref(strategy: string, symbol: string) {
  return `/build/${encodeURIComponent(strategy)}/${encodeURIComponent(symbol)}`;
}
