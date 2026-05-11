export function scanSymbolHref(symbolValue: string, fallbackSymbol = "AAPL") {
  const symbol = symbolValue.trim().toUpperCase() || fallbackSymbol;

  return `/scan?symbol=${encodeURIComponent(symbol)}`;
}
