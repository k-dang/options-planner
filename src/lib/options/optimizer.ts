import { strategyBuilderHref } from "@/lib/hrefs";
import { evaluateStrategy } from "./evaluate";
import { calculateExpectedMoveCushion } from "./metrics";
import { createGeneratedChain } from "./providers/generated";
import {
  type BuildStrategyInput,
  type OptimizerThesis,
  strategyTemplates,
} from "./strategy-templates";
import type {
  OptionChainSnapshot,
  StrategyEvaluation,
  StrategyState,
  StrategyTemplateId,
} from "./types";

export type { OptimizerThesis } from "./strategy-templates";

export type OptimizerInputs = {
  symbol: string;
  thesis: OptimizerThesis;
  minDaysToExpiration: number;
  maxDaysToExpiration: number;
  minProbabilityOfProfit?: number;
  expiration?: string;
  targetUnderlyingPrice?: number;
  returnChanceWeight?: number;
};

export type OptimizerCandidate = {
  id: string;
  state: StrategyState;
  evaluation: StrategyEvaluation;
  summary: {
    strategyLabel: string;
    expiration: string;
    strikes: number[];
    netPremium: number;
    maxProfit: number | null;
    maxLoss: number | null;
    probabilityOfProfit: number | null;
    delta: number;
    targetUnderlyingPrice: number;
    targetProfitLoss: number;
    returnProfitBasis: number;
    returnProfitBasisLabel: "max-profit" | "target-profit";
    riskDenominator: number | null;
    returnOnRisk: number | null;
    expectedMoveCushion: number | null;
    score: number;
    builderHref: string;
  };
};

export type OptimizerResultRow = {
  id: string;
  strategy: string;
  expiration: string;
  strikes: string;
  maxProfit: number | null;
  maxLoss: number | null;
  probabilityOfProfit: number | null;
  delta: number;
  targetUnderlyingPrice: number;
  targetProfitLoss: number;
  returnProfitBasis: number;
  returnProfitBasisLabel: "max-profit" | "target-profit";
  riskDenominator: number | null;
  returnOnRisk: number | null;
  expectedMoveCushion: number | null;
  builderHref: string;
};

function strategyLabel(strategy: StrategyTemplateId) {
  return strategyTemplates.get(strategy).label.toLowerCase();
}

function optionLegs(state: StrategyState) {
  return state.legs.filter((leg) => leg.kind === "option");
}

function candidateId(state: StrategyState) {
  return [
    state.strategy,
    state.symbol,
    ...optionLegs(state).map((leg) => `${leg.expiration}-${leg.strike}`),
  ].join(":");
}

function firstExpiration(state: StrategyState) {
  return optionLegs(state)[0]?.expiration ?? "n/a";
}

function daysBetween(asOfIso: string, expirationIso: string) {
  const start = new Date(asOfIso);
  const end = new Date(`${expirationIso}T20:00:00.000Z`);

  return Math.max(
    Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
    0,
  );
}

function returnMetrics(
  maxProfit: number | null,
  maxLoss: number | null,
  targetProfitLoss: number,
) {
  const returnProfitBasis =
    maxProfit === null ? Math.max(targetProfitLoss, 0) : maxProfit;
  const riskDenominator =
    maxLoss === null ? null : Math.max(Math.abs(maxLoss), 1);

  return {
    returnProfitBasis,
    returnProfitBasisLabel:
      maxProfit === null ? ("target-profit" as const) : ("max-profit" as const),
    riskDenominator,
    returnOnRisk:
      riskDenominator === null ? null : returnProfitBasis / riskDenominator,
  };
}

function candidateScore(
  returnChanceWeight: number | undefined,
  candidate: OptimizerCandidate,
  familyCandidates: OptimizerCandidate[],
) {
  const chanceWeight = clamp(returnChanceWeight ?? 50, 0, 100) / 100;
  const returnWeight = 1 - chanceWeight;
  const returnScores = familyCandidates.map(
    (item) => item.summary.returnOnRisk ?? 0,
  );
  const chanceScores = familyCandidates.map(
    (item) => item.evaluation.probabilityOfProfit ?? 0.35,
  );
  const normalizedReturn = normalizeValue(
    candidate.summary.returnOnRisk ?? 0,
    returnScores,
  );
  const normalizedChance = normalizeValue(
    candidate.evaluation.probabilityOfProfit ?? 0.35,
    chanceScores,
  );

  return returnWeight * normalizedReturn + chanceWeight * normalizedChance;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeValue(value: number, values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (max === min) {
    return 0.5;
  }

  return (value - min) / (max - min);
}

function passesFilters(
  inputs: OptimizerInputs,
  state: StrategyState,
  evaluation: StrategyEvaluation,
) {
  const expiration = firstExpiration(state);
  const days = daysBetween(state.asOf, expiration);

  if (inputs.expiration !== undefined && expiration !== inputs.expiration) {
    return false;
  }

  if (
    inputs.expiration === undefined &&
    (days < inputs.minDaysToExpiration || days > inputs.maxDaysToExpiration)
  ) {
    return false;
  }

  if (
    inputs.minProbabilityOfProfit !== undefined &&
    evaluation.probabilityOfProfit !== null &&
    evaluation.probabilityOfProfit < inputs.minProbabilityOfProfit
  ) {
    return false;
  }

  return true;
}

function targetUnderlyingPrice(
  inputs: OptimizerInputs,
  underlyingPrice: number,
) {
  if (
    inputs.targetUnderlyingPrice !== undefined &&
    Number.isFinite(inputs.targetUnderlyingPrice) &&
    inputs.targetUnderlyingPrice > 0
  ) {
    return inputs.targetUnderlyingPrice;
  }

  if (inputs.thesis === "bearish") {
    return Number((underlyingPrice * 0.92).toFixed(2));
  }

  if (inputs.thesis === "income") {
    return Number(underlyingPrice.toFixed(2));
  }

  return Number((underlyingPrice * 1.08).toFixed(2));
}

function targetProfitLoss(evaluation: StrategyEvaluation, targetPrice: number) {
  const payoff = evaluation.payoff;
  const first = payoff[0];
  const last = payoff[payoff.length - 1];

  if (!first || !last) {
    return 0;
  }

  if (targetPrice <= first.underlyingPrice) {
    return first.expirationProfitLoss;
  }

  if (targetPrice >= last.underlyingPrice) {
    return last.expirationProfitLoss;
  }

  for (let index = 1; index < payoff.length; index += 1) {
    const right = payoff[index];
    const left = payoff[index - 1];

    if (!left || !right || targetPrice > right.underlyingPrice) {
      continue;
    }

    const width = right.underlyingPrice - left.underlyingPrice;
    const weight =
      width === 0 ? 0 : (targetPrice - left.underlyingPrice) / width;

    return Number(
      (
        left.expirationProfitLoss +
        (right.expirationProfitLoss - left.expirationProfitLoss) * weight
      ).toFixed(2),
    );
  }

  return last.expirationProfitLoss;
}

function makeCandidate(
  inputs: OptimizerInputs,
  state: StrategyState,
): OptimizerCandidate | null {
  const validation = strategyTemplates.validate(state);

  if (!validation.valid) {
    return null;
  }

  const evaluation = evaluateStrategy(state);

  if (!passesFilters(inputs, state, evaluation)) {
    return null;
  }

  const legs = optionLegs(state);
  const targetPrice = targetUnderlyingPrice(inputs, state.underlyingPrice);
  const targetProfit = targetProfitLoss(evaluation, targetPrice);
  const metrics = returnMetrics(
    evaluation.maxProfit,
    evaluation.maxLoss,
    targetProfit,
  );

  return {
    id: candidateId(state),
    state,
    evaluation,
    summary: {
      strategyLabel: strategyLabel(state.strategy),
      expiration: firstExpiration(state),
      strikes: legs.map((leg) => leg.strike),
      netPremium: evaluation.netPremium,
      maxProfit: evaluation.maxProfit,
      maxLoss: evaluation.maxLoss,
      probabilityOfProfit: evaluation.probabilityOfProfit,
      delta: evaluation.greeks.delta,
      targetUnderlyingPrice: targetPrice,
      targetProfitLoss: targetProfit,
      returnProfitBasis: metrics.returnProfitBasis,
      returnProfitBasisLabel: metrics.returnProfitBasisLabel,
      riskDenominator: metrics.riskDenominator,
      returnOnRisk: metrics.returnOnRisk,
      expectedMoveCushion: calculateExpectedMoveCushion(state, evaluation),
      score: 0,
      builderHref: strategyBuilderHref(state),
    },
  };
}

function rankCandidatesByFamily(
  returnChanceWeight: number | undefined,
  candidates: OptimizerCandidate[],
) {
  const byStrategy = new Map<StrategyTemplateId, OptimizerCandidate[]>();

  for (const candidate of candidates) {
    const familyCandidates = byStrategy.get(candidate.state.strategy) ?? [];

    familyCandidates.push(candidate);
    byStrategy.set(candidate.state.strategy, familyCandidates);
  }

  const scored = candidates.map((candidate) => {
    const familyCandidates = byStrategy.get(candidate.state.strategy) ?? [
      candidate,
    ];

    return {
      ...candidate,
      summary: {
        ...candidate.summary,
        score: candidateScore(returnChanceWeight, candidate, familyCandidates),
      },
    };
  });

  return scored.sort((left, right) => right.summary.score - left.summary.score);
}

export function enumerateOptimizerCandidates(
  inputs: OptimizerInputs,
  chainInput?: OptionChainSnapshot,
): OptimizerCandidate[] {
  const symbol = inputs.symbol.trim().toUpperCase() || "AAPL";
  const chain = chainInput ?? createGeneratedChain(symbol);
  const targetPrice = targetUnderlyingPrice(inputs, chain.underlying.price);
  const candidates = new Map<string, OptimizerCandidate>();

  for (const seed of strategyTemplates.optimizerSeeds({
    thesis: inputs.thesis,
    chain,
    targetUnderlyingPrice: targetPrice,
    minDaysToExpiration: inputs.minDaysToExpiration,
    maxDaysToExpiration: inputs.maxDaysToExpiration,
    expiration: inputs.expiration,
  })) {
    const state = strategyTemplates.build({
      symbol,
      strategy: seed.strategy,
      expiration: seed.expiration,
      strikes: seed.strikes,
      quantity: seed.quantity,
      chain,
    });
    const candidate = makeCandidate(inputs, state);

    if (candidate) {
      candidates.set(candidate.id, candidate);
    }
  }

  return [...candidates.values()];
}

export function rankOptimizerCandidates(
  returnChanceWeight: number | undefined,
  candidates: OptimizerCandidate[],
): OptimizerCandidate[] {
  return rankCandidatesByFamily(returnChanceWeight, candidates);
}

export function optimizeStrategies(
  inputs: OptimizerInputs,
  chainInput?: OptionChainSnapshot,
): OptimizerCandidate[] {
  const candidates = enumerateOptimizerCandidates(inputs, chainInput);
  const strategies = strategyTemplates.optimizerStrategies(inputs.thesis);
  const ranked = rankCandidatesByFamily(inputs.returnChanceWeight, candidates);
  const selected = new Map<string, OptimizerCandidate>();

  const bestByStrategy = new Map<string, OptimizerCandidate>();
  for (const candidate of ranked) {
    if (!bestByStrategy.has(candidate.state.strategy)) {
      bestByStrategy.set(candidate.state.strategy, candidate);
    }
  }

  for (const strategy of strategies) {
    const bestForStrategy = bestByStrategy.get(strategy);

    if (bestForStrategy) {
      selected.set(bestForStrategy.id, bestForStrategy);
    }
  }

  for (const candidate of ranked) {
    if (selected.size >= 24) {
      break;
    }

    selected.set(candidate.id, candidate);
  }

  return [...selected.values()].toSorted(
    (left, right) => right.summary.score - left.summary.score,
  );
}

export type ScanInputs = {
  symbol: string;
  minDaysToExpiration: number;
  maxDaysToExpiration: number;
  minProbabilityOfProfit: number;
  enabledStrategies: StrategyTemplateId[];
  strikeWindowFraction?: number;
};

function strikesWithinRange(
  strikes: number[],
  price: number,
  fraction: number,
) {
  const min = price * (1 - fraction);
  const max = price * (1 + fraction);

  return strikes.filter((strike) => strike >= min && strike <= max);
}

export function scanRiskReward(
  inputs: ScanInputs,
  chainInput?: OptionChainSnapshot,
): OptimizerCandidate[] {
  const symbol = inputs.symbol.trim().toUpperCase() || "AAPL";
  const chain = chainInput ?? createGeneratedChain(symbol);
  const candidates = new Map<string, OptimizerCandidate>();
  const baseInputs: OptimizerInputs = {
    symbol,
    thesis: "bullish",
    minDaysToExpiration: inputs.minDaysToExpiration,
    maxDaysToExpiration: inputs.maxDaysToExpiration,
    minProbabilityOfProfit: inputs.minProbabilityOfProfit,
  };
  const windowFraction = inputs.strikeWindowFraction ?? 0.15;

  for (const expirationGroup of chain.expirations) {
    const days = expirationGroup.daysToExpiration;

    if (
      days < inputs.minDaysToExpiration ||
      days > inputs.maxDaysToExpiration
    ) {
      continue;
    }

    const expirationIso = expirationGroup.expiration;
    const allStrikes = expirationGroup.calls.map((quote) => quote.strike);
    const denseStrikes = strikesWithinRange(
      allStrikes,
      chain.underlying.price,
      windowFraction,
    );

    for (const strategy of inputs.enabledStrategies) {
      if (strategyTemplates.get(strategy).scanMode === "single-strike") {
        for (const strike of denseStrikes) {
          tryAddCandidate(candidates, baseInputs, {
            symbol,
            strategy,
            expiration: expirationIso,
            strikes: { option: strike, shortCall: strike, shortPut: strike },
            chain,
          });
        }
      } else {
        for (const seed of strategyTemplates.optimizerSeeds({
          thesis: baseInputs.thesis,
          chain: {
            ...chain,
            expirations: [expirationGroup],
          },
          targetUnderlyingPrice: chain.underlying.price,
          minDaysToExpiration: inputs.minDaysToExpiration,
          maxDaysToExpiration: inputs.maxDaysToExpiration,
          expiration: expirationIso,
        })) {
          if (seed.strategy !== strategy) {
            continue;
          }

          tryAddCandidate(candidates, baseInputs, {
            symbol,
            strategy,
            expiration: expirationIso,
            strikes: seed.strikes,
            chain,
          });
        }
      }
    }
  }

  return rankCandidatesByFamily(baseInputs.returnChanceWeight, [
    ...candidates.values(),
  ]);
}

function tryAddCandidate(
  candidates: Map<string, OptimizerCandidate>,
  baseInputs: OptimizerInputs,
  builderInput: BuildStrategyInput,
) {
  let state: StrategyState;

  try {
    state = strategyTemplates.build(builderInput);
  } catch {
    return;
  }

  const candidate = makeCandidate(baseInputs, state);

  if (candidate) {
    candidates.set(candidate.id, candidate);
  }
}

export function toOptimizerResultRows(
  candidates: OptimizerCandidate[],
): OptimizerResultRow[] {
  return candidates.map((candidate) => ({
    id: candidate.id,
    strategy: candidate.summary.strategyLabel,
    expiration: candidate.summary.expiration,
    strikes: candidate.summary.strikes
      .map((strike) => `$${strike}`)
      .join(" / "),
    maxProfit: candidate.summary.maxProfit,
    maxLoss: candidate.summary.maxLoss,
    probabilityOfProfit: candidate.summary.probabilityOfProfit,
    delta: candidate.summary.delta,
    targetUnderlyingPrice: candidate.summary.targetUnderlyingPrice,
    targetProfitLoss: candidate.summary.targetProfitLoss,
    returnProfitBasis: candidate.summary.returnProfitBasis,
    returnProfitBasisLabel: candidate.summary.returnProfitBasisLabel,
    riskDenominator: candidate.summary.riskDenominator,
    returnOnRisk: candidate.summary.returnOnRisk,
    expectedMoveCushion: candidate.summary.expectedMoveCushion,
    builderHref: candidate.summary.builderHref,
  }));
}
