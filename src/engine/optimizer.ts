import type {
  BuilderLeg,
  OptimizerCandidate,
  OptimizerRequest,
  OptionChain,
  UnderlyingQuote,
} from "@/domain";
import {
  calculateExpectedProfitAtPrice,
  calculateStrategyAnalytics,
} from "./analytics";

type OptimizerInput = {
  request: OptimizerRequest;
  quote: UnderlyingQuote;
  chainsByExpiry: Record<string, OptionChain>;
  valuationDate?: Date;
};

type StrategyDefinition = {
  strategyName: OptimizerCandidate["strategyName"];
  legs: BuilderLeg[];
};

export function runOptimizer(input: OptimizerInput): OptimizerCandidate[] {
  const valuationDate = input.valuationDate ?? new Date();
  const candidates = buildCandidateDefinitions(input).map((definition) => {
    const builderState = {
      symbol: input.request.symbol,
      templateName: definition.strategyName,
      horizonDays: input.request.horizonDays,
      riskFreeRate: input.request.riskFreeRate,
      commissions: input.request.commissions,
      ivOverrides: input.request.ivOverrides,
      grid: input.request.grid,
      legs: definition.legs,
    };

    const analytics = calculateStrategyAnalytics({
      builderState,
      quote: input.quote,
      chainsByExpiry: input.chainsByExpiry,
      valuationDate,
    });
    const expectedProfitAtTarget = calculateExpectedProfitAtPrice({
      builderState,
      quote: input.quote,
      chainsByExpiry: input.chainsByExpiry,
      valuationDate,
      targetPrice: input.request.targetPrice,
    });
    const objectiveValue =
      input.request.objective === "expectedProfit"
        ? expectedProfitAtTarget
        : analytics.summary.chanceOfProfitAtExpiration;

    return {
      strategyName: definition.strategyName,
      objectiveValue: round(objectiveValue, 4),
      expectedProfitAtTarget: round(expectedProfitAtTarget, 2),
      summary: analytics.summary,
      legs: definition.legs,
      builderState,
    } satisfies OptimizerCandidate;
  });

  return candidates
    .filter((candidate) => {
      if (input.request.maxLoss == null || candidate.summary.maxLoss == null) {
        return true;
      }
      return candidate.summary.maxLoss <= input.request.maxLoss;
    })
    .sort((left, right) => {
      if (right.objectiveValue !== left.objectiveValue) {
        return right.objectiveValue - left.objectiveValue;
      }
      return left.summary.netDebitOrCredit - right.summary.netDebitOrCredit;
    });
}

function buildCandidateDefinitions(
  input: OptimizerInput,
): StrategyDefinition[] {
  const expiries = Object.keys(input.chainsByExpiry).sort();
  const spot = input.quote.last;
  const definitions: StrategyDefinition[] = [];

  for (const expiry of expiries) {
    const chain = input.chainsByExpiry[expiry];
    const calls = getContractsInWindow(
      chain,
      "C",
      spot,
      input.request.strikeWindow,
    );
    const puts = getContractsInWindow(
      chain,
      "P",
      spot,
      input.request.strikeWindow,
    );

    if (input.request.maxLegs >= 1) {
      definitions.push(
        ...calls.map((contract) => ({
          strategyName: "Long Call" as const,
          legs: [
            optionLeg({
              side: "buy",
              right: "C",
              strike: contract.strike,
              expiry,
            }),
          ],
        })),
      );
      definitions.push(
        ...puts.map((contract) => ({
          strategyName: "Long Put" as const,
          legs: [
            optionLeg({
              side: "buy",
              right: "P",
              strike: contract.strike,
              expiry,
            }),
          ],
        })),
      );
    }

    if (input.request.maxLegs >= 2) {
      definitions.push(...buildBullCallSpreads(calls, expiry));
      definitions.push(...buildBearPutSpreads(puts, expiry));
    }
  }

  return dedupeDefinitions(definitions);
}

function buildBullCallSpreads(
  calls: OptionChain["contracts"],
  expiry: string,
): StrategyDefinition[] {
  const sortedCalls = [...calls].sort((a, b) => a.strike - b.strike);
  const definitions: StrategyDefinition[] = [];

  for (let i = 0; i < sortedCalls.length; i++) {
    for (let j = i + 1; j < sortedCalls.length; j++) {
      definitions.push({
        strategyName: "Bull Call Spread",
        legs: [
          optionLeg({
            side: "buy",
            right: "C",
            strike: sortedCalls[i].strike,
            expiry,
          }),
          optionLeg({
            side: "sell",
            right: "C",
            strike: sortedCalls[j].strike,
            expiry,
          }),
        ],
      });
    }
  }

  return definitions;
}

function buildBearPutSpreads(
  puts: OptionChain["contracts"],
  expiry: string,
): StrategyDefinition[] {
  const sortedPuts = [...puts].sort((a, b) => a.strike - b.strike);
  const definitions: StrategyDefinition[] = [];

  for (let i = 0; i < sortedPuts.length; i++) {
    for (let j = i + 1; j < sortedPuts.length; j++) {
      definitions.push({
        strategyName: "Bear Put Spread",
        legs: [
          optionLeg({
            side: "buy",
            right: "P",
            strike: sortedPuts[j].strike,
            expiry,
          }),
          optionLeg({
            side: "sell",
            right: "P",
            strike: sortedPuts[i].strike,
            expiry,
          }),
        ],
      });
    }
  }

  return definitions;
}

function getContractsInWindow(
  chain: OptionChain,
  right: "C" | "P",
  spot: number,
  strikeWindow: number,
) {
  return chain.contracts
    .filter((contract) => contract.right === right)
    .sort(
      (left, rightContract) =>
        Math.abs(left.strike - spot) - Math.abs(rightContract.strike - spot),
    )
    .slice(0, strikeWindow + 1)
    .sort((left, rightContract) => left.strike - rightContract.strike);
}

function optionLeg(args: {
  side: "buy" | "sell";
  right: "C" | "P";
  strike: number;
  expiry: string;
}): BuilderLeg {
  return {
    kind: "option",
    side: args.side,
    qty: 1,
    right: args.right,
    strike: args.strike,
    expiry: args.expiry,
    entryPriceMode: "mark",
  };
}

function dedupeDefinitions(definitions: StrategyDefinition[]) {
  const seen = new Set<string>();
  return definitions.filter((definition) => {
    const key = `${definition.strategyName}:${definition.legs
      .map(
        (leg) =>
          `${leg.side}-${leg.right ?? "S"}-${leg.strike ?? 0}-${leg.expiry ?? ""}`,
      )
      .join("|")}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function round(value: number, decimals = 4) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
