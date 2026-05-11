export function builderStrategyHref(strategy: string, symbol: string) {
  return `/build/${encodeURIComponent(strategy)}/${encodeURIComponent(symbol)}`;
}
