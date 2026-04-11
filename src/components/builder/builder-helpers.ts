import type { OptionIndex } from "@/modules/market/schemas";
import type {
  BuilderLegInput,
  StrategyCalcResponse,
} from "@/modules/strategies/schemas";

export function parsePositiveIntegerInput(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return Math.trunc(parsed);
}

export function parsePositiveNumberInput(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function isCompletePositiveIntegerInput(value: string) {
  return /^\d+$/.test(value.trim());
}

export function isCompletePositiveNumberInput(value: string) {
  return /^\d+(\.\d+)?$/.test(value.trim());
}

export function formatCommittedIntegerInput(
  value: string,
  fallbackValue: number,
) {
  const parsed = parsePositiveIntegerInput(value);
  return parsed === null ? `${fallbackValue}` : `${parsed}`;
}

export function formatCommittedNumberInput(
  value: string,
  fallbackValue: string,
) {
  const parsed = parsePositiveNumberInput(value);
  return parsed === null ? fallbackValue : formatNumber(parsed);
}

export function getStrikeOptions(
  leg: BuilderLegInput,
  optionIndex: OptionIndex | null,
) {
  if (leg.kind !== "option" || !leg.expiry || !leg.right) {
    return [];
  }

  const expiryEntry = optionIndex?.expirations.find(
    (entry) => entry.expiry === leg.expiry,
  );
  if (!expiryEntry) {
    return leg.strike == null ? [] : [`${leg.strike}`];
  }

  return (leg.right === "C" ? expiryEntry.calls : expiryEntry.puts).map(
    (strike) => `${strike}`,
  );
}

export function getDefaultStrikeForExpiry(args: {
  optionIndex: OptionIndex | null | undefined;
  expiry: string;
  right: BuilderLegInput["right"];
  currentStrike: number | undefined;
}) {
  if (!args.right) {
    return args.currentStrike;
  }

  const expiryEntry = args.optionIndex?.expirations.find(
    (entry) => entry.expiry === args.expiry,
  );
  const strikes =
    args.right === "C" ? expiryEntry?.calls.slice() : expiryEntry?.puts.slice();

  if (!strikes || strikes.length === 0) {
    return args.currentStrike;
  }

  if (args.currentStrike == null) {
    return strikes[0];
  }

  const currentStrike = args.currentStrike;

  return strikes.reduce((closest, strike) => {
    if (Math.abs(strike - currentStrike) < Math.abs(closest - currentStrike)) {
      return strike;
    }

    return closest;
  }, strikes[0]);
}

export function getSummaryMetrics(data: StrategyCalcResponse["data"] | null) {
  return [
    {
      label: "Net debit / credit",
      value:
        data === null ? "--" : formatCurrency(data.summary.netDebitOrCredit),
    },
    {
      label: "Max profit",
      value:
        data === null ? "--" : formatNullableCurrency(data.summary.maxProfit),
    },
    {
      label: "Max loss",
      value:
        data === null ? "--" : formatNullableCurrency(data.summary.maxLoss),
    },
    {
      label: "Chance at horizon",
      value:
        data === null
          ? "--"
          : formatPercent(data.summary.chanceOfProfitAtHorizon),
    },
    {
      label: "Chance at expiration",
      value:
        data === null
          ? "--"
          : formatPercent(data.summary.chanceOfProfitAtExpiration),
    },
    {
      label: "Breakevens",
      value:
        data === null
          ? "--"
          : data.summary.breakevens.length > 0
            ? data.summary.breakevens
                .map((value) => formatCurrency(value))
                .join(", ")
            : "None",
    },
  ];
}

export function getGreekMetrics(data: StrategyCalcResponse["data"] | null) {
  const greeks = data?.summary.netGreeks;

  return [
    ["Delta", greeks?.delta],
    ["Gamma", greeks?.gamma],
    ["Theta", greeks?.theta],
    ["Vega", greeks?.vega],
    ["Rho", greeks?.rho],
  ] as const;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNullableCurrency(value: number | null) {
  return value == null ? "Unlimited" : formatCurrency(value);
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatAxisCurrency(value: number) {
  return `$${Math.round(value)}`;
}

export function formatNumber(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}
