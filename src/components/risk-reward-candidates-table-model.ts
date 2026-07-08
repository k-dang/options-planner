import type { OptimizerCandidate } from "@/lib/options/optimizer";

export type RiskRewardSortDirection = "asc" | "desc";

export type RiskRewardSort = {
  column: RiskRewardSortColumn;
  dir: RiskRewardSortDirection;
};

export type RiskRewardCandidate = OptimizerCandidate & {
  ticker?: string;
};

const RETURN_ON_RISK_SORT_CAP = 5;

const riskRewardSortDefinitions = {
  ticker: {
    defaultDirection: "asc",
    nulls: "first",
    value: (candidate) => candidate.ticker ?? candidate.state.symbol,
  },
  strategy: {
    defaultDirection: "asc",
    nulls: "first",
    value: (candidate) => candidate.summary.strategyLabel,
  },
  expiration: {
    defaultDirection: "asc",
    nulls: "first",
    value: (candidate) => candidate.summary.expiration,
  },
  score: {
    defaultDirection: "desc",
    nulls: "first",
    value: (candidate) => candidate.summary.score,
  },
  maxProfit: {
    defaultDirection: "desc",
    nulls: "first",
    value: (candidate) => candidate.summary.maxProfit,
  },
  maxLoss: {
    defaultDirection: "desc",
    nulls: "first",
    value: (candidate) => candidate.summary.maxLoss,
  },
  returnOnRisk: {
    defaultDirection: "desc",
    nulls: "first",
    value: (candidate) => cappedReturnOnRisk(candidate.summary.returnOnRisk),
  },
  expectedMoveCushion: {
    defaultDirection: "desc",
    nulls: "last",
    value: (candidate) => candidate.summary.expectedMoveCushion,
  },
  probabilityOfProfit: {
    defaultDirection: "desc",
    nulls: "first",
    value: (candidate) => candidate.summary.probabilityOfProfit,
  },
} satisfies Record<
  string,
  {
    defaultDirection: RiskRewardSortDirection;
    nulls?: "first" | "last";
    value: (candidate: RiskRewardCandidate) => string | number | null;
  }
>;

export type RiskRewardSortColumn = keyof typeof riskRewardSortDefinitions;

export function defaultRiskRewardSortDirection(
  column: RiskRewardSortColumn,
): RiskRewardSortDirection {
  return riskRewardSortDefinitions[column].defaultDirection;
}

export function formatExpectedMoveCushion(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  const rounded = Number(value.toFixed(1));
  const sign = rounded > 0 ? "+" : "";

  return `${sign}${rounded.toFixed(1)}x`;
}

export function sortRiskRewardCandidates(
  candidates: RiskRewardCandidate[],
  sort: RiskRewardSort,
) {
  return candidates.toSorted((left, right) => compare(left, right, sort));
}

function compare(
  left: RiskRewardCandidate,
  right: RiskRewardCandidate,
  sort: RiskRewardSort,
) {
  const sign = sort.dir === "asc" ? 1 : -1;
  const definition = riskRewardSortDefinitions[sort.column];
  const leftValue = definition.value(left);
  const rightValue = definition.value(right);

  if (typeof leftValue === "string" && typeof rightValue === "string") {
    return sign * leftValue.localeCompare(rightValue);
  }

  return compareNullableNumbers(leftValue, rightValue, sign, definition.nulls);
}

function compareNullableNumbers(
  left: string | number | null,
  right: string | number | null,
  sign: number,
  nulls: "first" | "last",
) {
  if (left === null && right === null) return 0;
  if (left === null) return nulls === "first" ? -1 : 1;
  if (right === null) return nulls === "first" ? 1 : -1;

  return sign * (Number(left) - Number(right));
}

function cappedReturnOnRisk(value: number | null) {
  return value === null ? null : Math.min(value, RETURN_ON_RISK_SORT_CAP);
}
