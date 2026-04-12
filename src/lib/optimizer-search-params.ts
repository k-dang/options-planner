import type { OptimizerRunInput } from "@/modules/optimizer/load-optimizer-snapshot";

type SearchParamValue = string | string[] | undefined;

type OptimizerSearchParams = {
  symbol?: SearchParamValue;
};

export function parseOptimizerSearchParams(
  params: OptimizerSearchParams,
): OptimizerRunInput | null {
  const symbol = normalizeString(getFirstValue(params.symbol))?.toUpperCase();
  if (!symbol) {
    return null;
  }

  return {
    symbol,
  };
}

export function serializeOptimizerSearchParams(input: OptimizerRunInput) {
  const params = new URLSearchParams();

  params.set("symbol", input.symbol.trim().toUpperCase());

  return params;
}

export function buildOptimizerHref(pathname: string, input: OptimizerRunInput) {
  const search = serializeOptimizerSearchParams(input).toString();
  return search ? `${pathname}?${search}` : pathname;
}

function getFirstValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeString(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
