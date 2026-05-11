export function optimizeSymbolHref(
  symbolValue: string,
  fallbackSymbol = "AAPL",
) {
  const symbol = symbolValue.trim().toUpperCase() || fallbackSymbol;

  return `/optimize?symbol=${encodeURIComponent(symbol)}`;
}
