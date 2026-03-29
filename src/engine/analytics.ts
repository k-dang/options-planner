import type {
  BuilderLeg,
  BuilderState,
  OptionChain,
  OptionChainContract,
  UnderlyingQuote,
} from "@/domain";

export type AnalyticsInput = {
  builderState: BuilderState;
  quote: UnderlyingQuote;
  chainsByExpiry: Record<string, OptionChain>;
  valuationDate?: Date;
};

export type AnalyticsResult = {
  summary: {
    netDebitOrCredit: number;
    maxProfit: number | null;
    maxLoss: number | null;
    breakevens: number[];
    chanceOfProfitAtHorizon: number;
    chanceOfProfitAtExpiration: number;
    netGreeks: {
      delta: number;
      gamma: number;
      theta: number;
      vega: number;
      rho: number;
    };
  };
  grid: {
    prices: number[];
    dates: string[];
    values: number[][];
  };
  chart: {
    selectedDate: string;
    series: Array<{ price: number; pnl: number }>;
    impliedMove1x: { down: number; up: number };
    impliedMove2x: { down: number; up: number };
  };
};

type ResolvedOptionLeg = {
  kind: "option";
  side: "buy" | "sell";
  qty: number;
  expiry: string;
  strike: number;
  right: "C" | "P";
  entryPrice: number;
  contract: OptionChainContract;
  iv: number;
  multiplier: number;
};

type ResolvedStockLeg = {
  kind: "stock";
  side: "buy" | "sell";
  qty: number;
  entryPrice: number;
};

type ResolvedLeg = ResolvedOptionLeg | ResolvedStockLeg;

export function calculateStrategyAnalytics(
  input: AnalyticsInput,
): AnalyticsResult {
  const valuationDate = input.valuationDate ?? new Date();
  const pricePoints = Math.max(
    3,
    Math.trunc(input.builderState.grid.pricePoints),
  );
  const datePoints = Math.max(
    2,
    Math.trunc(input.builderState.grid.datePoints),
  );
  const priceRangePct = Math.max(0.05, input.builderState.grid.priceRangePct);
  const horizonDays = Math.max(1, Math.trunc(input.builderState.horizonDays));

  const resolvedLegs = input.builderState.legs.map((leg) =>
    resolveLeg(leg, input),
  );
  const totalEntryFees = getEntryFees(input.builderState, resolvedLegs);
  const gridPrices = linspace(
    input.quote.last * (1 - priceRangePct),
    input.quote.last * (1 + priceRangePct),
    pricePoints,
  ).map((price) => round(price, 2));
  const horizonDates = buildDateGrid(valuationDate, horizonDays, datePoints);
  const gridValues = gridPrices.map((price) =>
    horizonDates.map((date) =>
      round(
        calculateTotalPnl({
          price,
          scenarioDate: date,
          valuationDate,
          resolvedLegs,
          quote: input.quote,
          totalEntryFees,
        }),
        2,
      ),
    ),
  );

  const summaryScanPrices = linspace(
    0,
    input.quote.last * (1 + Math.max(priceRangePct * 2, 1)),
    161,
  );
  const finalExpiry = resolvedLegs.reduce(
    (latest, leg) => {
      if (leg.kind !== "option") {
        return latest;
      }
      const expiry = new Date(`${leg.expiry}T00:00:00Z`);
      return expiry > latest ? expiry : latest;
    },
    addDays(valuationDate, horizonDays),
  );
  const expirationPnls = summaryScanPrices.map((price) =>
    calculateTotalPnl({
      price,
      scenarioDate: finalExpiry,
      valuationDate,
      resolvedLegs,
      quote: input.quote,
      totalEntryFees,
    }),
  );

  const breakevens = findBreakevens(summaryScanPrices, expirationPnls);
  const upsideUnbounded = getUpsideSlope(resolvedLegs) > 0;
  const maxProfit = upsideUnbounded
    ? null
    : round(Math.max(...expirationPnls), 2);
  const maxLoss = round(Math.abs(Math.min(...expirationPnls)), 2);
  const netDebitOrCredit = round(
    getNetEntryCost(resolvedLegs) + totalEntryFees,
    2,
  );
  const avgIv = getAverageIv(resolvedLegs);
  const chartDate = horizonDates[horizonDates.length - 1];
  const chartSeries = gridPrices.map((price, index) => ({
    price,
    pnl: gridValues[index][gridValues[index].length - 1],
  }));

  return {
    summary: {
      netDebitOrCredit,
      maxProfit,
      maxLoss,
      breakevens,
      chanceOfProfitAtHorizon: round(
        probabilityOfProfit({
          prices: summaryScanPrices,
          pnls: summaryScanPrices.map((price) =>
            calculateTotalPnl({
              price,
              scenarioDate: chartDate,
              valuationDate,
              resolvedLegs,
              quote: input.quote,
              totalEntryFees,
            }),
          ),
          spot: input.quote.last,
          iv: avgIv,
          years: yearFraction(valuationDate, chartDate),
        }),
        4,
      ),
      chanceOfProfitAtExpiration: round(
        probabilityOfProfit({
          prices: summaryScanPrices,
          pnls: expirationPnls,
          spot: input.quote.last,
          iv: avgIv,
          years: yearFraction(valuationDate, finalExpiry),
        }),
        4,
      ),
      netGreeks: aggregateGreeks(resolvedLegs),
    },
    grid: {
      prices: gridPrices,
      dates: horizonDates.map(toIsoDate),
      values: gridValues,
    },
    chart: {
      selectedDate: toIsoDate(chartDate),
      series: chartSeries,
      impliedMove1x: getImpliedMove(
        input.quote.last,
        avgIv,
        yearFraction(valuationDate, chartDate),
        1,
      ),
      impliedMove2x: getImpliedMove(
        input.quote.last,
        avgIv,
        yearFraction(valuationDate, chartDate),
        2,
      ),
    },
  };
}

function resolveLeg(leg: BuilderLeg, input: AnalyticsInput): ResolvedLeg {
  if (leg.kind === "stock") {
    return {
      kind: "stock",
      side: leg.side,
      qty: leg.qty,
      entryPrice: getStockEntryPrice(leg, input.quote),
    };
  }

  if (!leg.right || leg.strike == null || !leg.expiry) {
    throw new Error("Option legs require right, strike, and expiry");
  }

  const chain = input.chainsByExpiry[leg.expiry];
  const contract = chain?.contracts.find(
    (row) => row.right === leg.right && row.strike === leg.strike,
  );
  if (!contract) {
    throw new Error(
      `Missing option contract for ${leg.expiry} ${leg.right} ${leg.strike}`,
    );
  }

  return {
    kind: "option",
    side: leg.side,
    qty: leg.qty,
    expiry: leg.expiry,
    strike: leg.strike,
    right: leg.right,
    entryPrice: getOptionEntryPrice(leg, contract),
    contract,
    iv: getLegIv(leg.expiry, contract.iv, input.builderState),
    multiplier: contract.multiplier,
  };
}

function calculateTotalPnl(args: {
  price: number;
  scenarioDate: Date;
  valuationDate: Date;
  resolvedLegs: ResolvedLeg[];
  quote: UnderlyingQuote;
  totalEntryFees: number;
}) {
  const pnlBeforeFees = args.resolvedLegs.reduce((total, leg) => {
    if (leg.kind === "stock") {
      const side = leg.side === "buy" ? 1 : -1;
      return total + side * (args.price - leg.entryPrice) * leg.qty;
    }

    const side = leg.side === "buy" ? 1 : -1;
    const scenarioValue = getScenarioOptionValue({
      contract: leg.contract,
      iv: leg.iv,
      entryPrice: leg.entryPrice,
      currentSpot: args.quote.last,
      price: args.price,
      scenarioDate: args.scenarioDate,
      valuationDate: args.valuationDate,
      expiry: leg.expiry,
    });
    return (
      total + side * (scenarioValue - leg.entryPrice) * leg.qty * leg.multiplier
    );
  }, 0);

  return pnlBeforeFees - args.totalEntryFees;
}

function getScenarioOptionValue(args: {
  contract: OptionChainContract;
  iv: number;
  entryPrice: number;
  currentSpot: number;
  price: number;
  scenarioDate: Date;
  valuationDate: Date;
  expiry: string;
}) {
  const expiryDate = new Date(`${args.expiry}T00:00:00Z`);
  const totalYears = Math.max(
    1 / 365,
    yearFraction(args.valuationDate, expiryDate),
  );
  const remainingYears = Math.max(
    0,
    yearFraction(args.scenarioDate, expiryDate),
  );
  const scenarioIntrinsic = intrinsicValue(
    args.contract.right,
    args.price,
    args.contract.strike,
  );
  if (remainingYears === 0) {
    return scenarioIntrinsic;
  }

  const currentIntrinsic = intrinsicValue(
    args.contract.right,
    args.currentSpot,
    args.contract.strike,
  );
  const currentExtrinsic = Math.max(
    args.contract.mark - currentIntrinsic,
    0.01,
  );
  const decay = Math.sqrt(remainingYears / totalYears);
  const moneynessPenalty = Math.exp(
    -Math.abs(Math.log(Math.max(args.price, 0.01) / args.contract.strike)) /
      Math.max(args.iv * Math.sqrt(remainingYears), 0.1),
  );

  return round(
    scenarioIntrinsic + currentExtrinsic * decay * moneynessPenalty,
    4,
  );
}

function aggregateGreeks(resolvedLegs: ResolvedLeg[]) {
  return resolvedLegs.reduce(
    (total, leg) => {
      if (leg.kind === "stock") {
        total.delta += leg.side === "buy" ? leg.qty : -leg.qty;
        return total;
      }

      const side = leg.side === "buy" ? 1 : -1;
      total.delta += side * leg.contract.delta * leg.qty * leg.multiplier;
      total.gamma += side * leg.contract.gamma * leg.qty * leg.multiplier;
      total.theta += side * leg.contract.theta * leg.qty * leg.multiplier;
      total.vega += side * leg.contract.vega * leg.qty * leg.multiplier;
      total.rho += side * leg.contract.rho * leg.qty * leg.multiplier;
      return total;
    },
    { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 },
  );
}

function probabilityOfProfit(args: {
  prices: number[];
  pnls: number[];
  spot: number;
  iv: number;
  years: number;
}) {
  const years = Math.max(args.years, 1 / 365);
  const sigma = Math.max(args.iv, 0.05) * Math.sqrt(years);
  let total = 0;

  for (let i = 0; i < args.prices.length; i++) {
    if (args.pnls[i] <= 0) {
      continue;
    }
    const lower = i === 0 ? 0.0001 : (args.prices[i - 1] + args.prices[i]) / 2;
    const upper =
      i === args.prices.length - 1
        ? args.prices[i] * 1.25 + args.spot * 0.25
        : (args.prices[i] + args.prices[i + 1]) / 2;
    total +=
      lognormalCdf(upper, args.spot, sigma) -
      lognormalCdf(lower, args.spot, sigma);
  }

  return Math.min(1, Math.max(0, total));
}

function getNetEntryCost(resolvedLegs: ResolvedLeg[]) {
  return resolvedLegs.reduce((total, leg) => {
    if (leg.kind === "stock") {
      const side = leg.side === "buy" ? 1 : -1;
      return total + side * leg.entryPrice * leg.qty;
    }
    const side = leg.side === "buy" ? 1 : -1;
    return total + side * leg.entryPrice * leg.qty * leg.multiplier;
  }, 0);
}

function getEntryFees(builderState: BuilderState, resolvedLegs: ResolvedLeg[]) {
  const perContractFees = resolvedLegs.reduce((total, leg) => {
    if (leg.kind !== "option") {
      return total;
    }
    return total + Math.abs(leg.qty) * builderState.commissions.perContract;
  }, 0);

  return (
    perContractFees + resolvedLegs.length * builderState.commissions.perLegFee
  );
}

function getAverageIv(resolvedLegs: ResolvedLeg[]) {
  const optionLegs = resolvedLegs.filter(
    (leg): leg is ResolvedOptionLeg => leg.kind === "option",
  );
  if (optionLegs.length === 0) {
    return 0.2;
  }
  return (
    optionLegs.reduce((total, leg) => total + leg.iv, 0) / optionLegs.length
  );
}

function getUpsideSlope(resolvedLegs: ResolvedLeg[]) {
  return resolvedLegs.reduce((total, leg) => {
    if (leg.kind === "stock") {
      return total + (leg.side === "buy" ? leg.qty : -leg.qty);
    }
    if (leg.right !== "C") {
      return total;
    }
    const side = leg.side === "buy" ? 1 : -1;
    return total + side * leg.qty;
  }, 0);
}

function findBreakevens(prices: number[], pnls: number[]) {
  const points: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = pnls[i - 1];
    const next = pnls[i];
    if (prev === 0) {
      points.push(round(prices[i - 1], 2));
      continue;
    }
    if ((prev < 0 && next > 0) || (prev > 0 && next < 0)) {
      const ratio = Math.abs(prev) / (Math.abs(prev) + Math.abs(next));
      points.push(
        round(prices[i - 1] + (prices[i] - prices[i - 1]) * ratio, 2),
      );
    }
  }
  return [...new Set(points)];
}

function getStockEntryPrice(leg: BuilderLeg, quote: UnderlyingQuote) {
  switch (leg.entryPriceMode) {
    case "bid":
      return quote.bid;
    case "ask":
      return quote.ask;
    case "mid":
      return (quote.bid + quote.ask) / 2;
    case "manual":
      return leg.manualEntryPrice ?? quote.last;
    default:
      return quote.last;
  }
}

function getOptionEntryPrice(leg: BuilderLeg, contract: OptionChainContract) {
  switch (leg.entryPriceMode) {
    case "bid":
      return contract.bid;
    case "ask":
      return contract.ask;
    case "mid":
      return (contract.bid + contract.ask) / 2;
    case "manual":
      return leg.manualEntryPrice ?? contract.mark;
    default:
      return contract.mark;
  }
}

function getLegIv(expiry: string, baseIv: number, builderState: BuilderState) {
  return (
    builderState.ivOverrides.byExpiry[expiry] ??
    builderState.ivOverrides.global ??
    baseIv
  );
}

function getImpliedMove(
  spot: number,
  iv: number,
  years: number,
  multiple: number,
) {
  const move =
    spot * Math.max(iv, 0.05) * Math.sqrt(Math.max(years, 1 / 365)) * multiple;
  return {
    down: round(Math.max(0, spot - move), 2),
    up: round(spot + move, 2),
  };
}

function intrinsicValue(right: "C" | "P", price: number, strike: number) {
  return right === "C"
    ? Math.max(price - strike, 0)
    : Math.max(strike - price, 0);
}

function buildDateGrid(start: Date, horizonDays: number, datePoints: number) {
  const steps = linspace(0, horizonDays, datePoints);
  return steps.map((days) => addDays(start, Math.round(days)));
}

function yearFraction(from: Date, to: Date) {
  return (
    Math.max(0, to.getTime() - from.getTime()) / (365 * 24 * 60 * 60 * 1000)
  );
}

function linspace(start: number, end: number, count: number) {
  if (count <= 1) {
    return [start];
  }
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, index) => start + step * index);
}

function lognormalCdf(x: number, spot: number, sigma: number) {
  if (x <= 0) {
    return 0;
  }
  const z = (Math.log(x / spot) + 0.5 * sigma * sigma) / sigma;
  return normalCdf(z);
}

function normalCdf(x: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const probability =
    1 -
    d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x >= 0 ? probability : 1 - probability;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
