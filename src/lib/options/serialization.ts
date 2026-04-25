import type { PositionLeg, StrategyState } from "./types";

function normalizeNumber(value: number) {
  return Number(value.toFixed(6));
}

function sortLegs(left: PositionLeg, right: PositionLeg) {
  if (left.kind !== right.kind) {
    return left.kind.localeCompare(right.kind);
  }

  if (left.kind === "stock" || right.kind === "stock") {
    return left.side.localeCompare(right.side);
  }

  return (
    left.expiration.localeCompare(right.expiration) ||
    left.optionType.localeCompare(right.optionType) ||
    left.strike - right.strike ||
    left.side.localeCompare(right.side)
  );
}

export function normalizeStrategyState(state: StrategyState): StrategyState {
  return {
    version: 1,
    strategy: state.strategy,
    symbol: state.symbol.trim().toUpperCase(),
    underlyingPrice: normalizeNumber(state.underlyingPrice),
    asOf: new Date(state.asOf).toISOString(),
    legs: [...state.legs].sort(sortLegs).map((leg) => {
      if (leg.kind === "stock") {
        return {
          kind: "stock",
          side: leg.side,
          quantity: normalizeNumber(leg.quantity),
          entryPrice: normalizeNumber(leg.entryPrice),
        };
      }

      return {
        kind: "option",
        optionType: leg.optionType,
        side: leg.side,
        quantity: normalizeNumber(leg.quantity),
        expiration: leg.expiration,
        strike: normalizeNumber(leg.strike),
        premium: normalizeNumber(leg.premium),
        impliedVolatility: normalizeNumber(leg.impliedVolatility),
      };
    }),
  };
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decodeBase64Url(value: string) {
  const padded = value.padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    "=",
  );
  const base64 = padded.replaceAll("-", "+").replaceAll("_", "/");

  return Buffer.from(base64, "base64").toString("utf8");
}

export function serializeStrategyState(state: StrategyState) {
  const canonicalJson = JSON.stringify(normalizeStrategyState(state));

  return `s=${encodeBase64Url(canonicalJson)}`;
}

export function parseStrategyState(serialized: string): StrategyState {
  const params = new URLSearchParams(
    serialized.startsWith("?") ? serialized.slice(1) : serialized,
  );
  const encoded = params.get("s");

  if (!encoded) {
    throw new Error("Missing serialized strategy state.");
  }

  return normalizeStrategyState(
    JSON.parse(decodeBase64Url(encoded)) as StrategyState,
  );
}
