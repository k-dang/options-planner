import {
  createBuilderState,
  getBuilderChain,
  serializeBuilderState,
} from "./builder";
import { evaluateStrategy } from "./evaluate";
import { validateStrategyState } from "./strategy";
import type {
  StrategyEvaluation,
  StrategyState,
  StrategyTemplateId,
} from "./types";

export type OptimizerThesis = "bullish" | "bearish" | "income";
export type OptimizerRankingMode =
  | "max-profit"
  | "return-on-capital"
  | "downside-buffer"
  | "target-profit"
  | "target-probability"
  | "delta-range";

export type OptimizerInputs = {
  symbol: string;
  thesis: OptimizerThesis;
  rankingMode?: OptimizerRankingMode;
  minDaysToExpiration: number;
  maxDaysToExpiration: number;
  maxCapitalRequired: number;
  minProbabilityOfProfit?: number;
  targetUnderlyingPrice?: number;
  targetProbabilityOfProfit?: number;
  targetDelta?: number;
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
    capitalRequired: number;
    maxProfit: number | null;
    maxLoss: number | null;
    probabilityOfProfit: number | null;
    delta: number;
    targetUnderlyingPrice: number;
    targetProfitLoss: number;
    score: number;
    builderHref: string;
  };
};

export type OptimizerResultRow = {
  id: string;
  strategy: string;
  expiration: string;
  strikes: string;
  capitalRequired: number;
  maxProfit: number | null;
  maxLoss: number | null;
  probabilityOfProfit: number | null;
  delta: number;
  targetUnderlyingPrice: number;
  targetProfitLoss: number;
  builderHref: string;
};

const THESIS_STRATEGIES: Record<OptimizerThesis, StrategyTemplateId[]> = {
  bullish: ["long-call", "bull-call-spread", "cash-secured-put"],
  bearish: ["long-put", "bear-put-spread"],
  income: ["covered-call", "cash-secured-put"],
};

function strategyLabel(strategy: StrategyTemplateId) {
  return strategy.replaceAll("-", " ");
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

function candidateScore(
  inputs: OptimizerInputs,
  evaluation: StrategyEvaluation,
) {
  const maxLoss = evaluation.maxLoss ?? -evaluation.capitalRequired;
  const risk = Math.max(Math.abs(maxLoss), evaluation.capitalRequired, 1);
  const returnScore = (evaluation.maxProfit ?? 0) / risk;
  const probability = evaluation.probabilityOfProfit ?? 0.35;
  const delta = evaluation.greeks.delta;
  const mode = inputs.rankingMode ?? "return-on-capital";

  if (mode === "max-profit") {
    return evaluation.maxProfit ?? Number.NEGATIVE_INFINITY;
  }

  if (mode === "return-on-capital") {
    return returnScore;
  }

  if (mode === "downside-buffer") {
    return downsideBuffer(evaluation);
  }

  if (mode === "target-profit") {
    return targetProfitLoss(
      evaluation,
      targetUnderlyingPrice(inputs, evaluation.state.underlyingPrice),
    );
  }

  if (mode === "target-probability") {
    const targetProbability = inputs.targetProbabilityOfProfit ?? 0.65;

    return -Math.abs(probability - targetProbability);
  }

  if (mode === "delta-range") {
    const targetDelta = inputs.targetDelta ?? defaultTargetDelta(inputs.thesis);

    return -Math.abs(delta - targetDelta);
  }

  if (inputs.thesis === "bullish") {
    return returnScore + probability + Math.max(delta, 0) / 100;
  }

  if (inputs.thesis === "bearish") {
    return returnScore + probability + Math.max(-delta, 0) / 100;
  }

  return probability + Math.max(evaluation.netPremium, 0) / risk;
}

function defaultTargetDelta(thesis: OptimizerThesis) {
  if (thesis === "bearish") {
    return -35;
  }

  if (thesis === "income") {
    return 25;
  }

  return 45;
}

function downsideBuffer(evaluation: StrategyEvaluation) {
  const breakeven = evaluation.breakevens[0];

  if (breakeven === undefined || evaluation.state.underlyingPrice <= 0) {
    return Number.NEGATIVE_INFINITY;
  }

  return (
    (evaluation.state.underlyingPrice - breakeven) /
    evaluation.state.underlyingPrice
  );
}

function passesFilters(
  inputs: OptimizerInputs,
  state: StrategyState,
  evaluation: StrategyEvaluation,
) {
  const expiration = firstExpiration(state);
  const days = daysBetween(state.asOf, expiration);

  if (days < inputs.minDaysToExpiration || days > inputs.maxDaysToExpiration) {
    return false;
  }

  if (evaluation.capitalRequired > inputs.maxCapitalRequired) {
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
  const validation = validateStrategyState(state);

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
  const score = candidateScore(inputs, evaluation);

  return {
    id: candidateId(state),
    state,
    evaluation,
    summary: {
      strategyLabel: strategyLabel(state.strategy),
      expiration: firstExpiration(state),
      strikes: legs.map((leg) => leg.strike),
      netPremium: evaluation.netPremium,
      capitalRequired: evaluation.capitalRequired,
      maxProfit: evaluation.maxProfit,
      maxLoss: evaluation.maxLoss,
      probabilityOfProfit: evaluation.probabilityOfProfit,
      delta: evaluation.greeks.delta,
      targetUnderlyingPrice: targetPrice,
      targetProfitLoss: targetProfit,
      score,
      builderHref: serializeBuilderState(state),
    },
  };
}

type CandidateInput = {
  strikeOffset: number;
  strike2Offset?: number;
};

function candidateInputs(strategy: StrategyTemplateId): CandidateInput[] {
  if (strategy === "bull-call-spread") {
    return [
      { strikeOffset: -1, strike2Offset: 1 },
      { strikeOffset: 0, strike2Offset: 2 },
    ];
  }

  if (strategy === "bear-put-spread") {
    return [
      { strikeOffset: 1, strike2Offset: -1 },
      { strikeOffset: 0, strike2Offset: -2 },
    ];
  }

  if (strategy === "covered-call") {
    return [{ strikeOffset: 1 }, { strikeOffset: 2 }, { strikeOffset: 3 }];
  }

  if (strategy === "cash-secured-put") {
    return [{ strikeOffset: -1 }, { strikeOffset: -2 }, { strikeOffset: -3 }];
  }

  return [{ strikeOffset: -1 }, { strikeOffset: 0 }, { strikeOffset: 1 }];
}

function strikeAt(strikes: number[], underlyingPrice: number, offset: number) {
  const sorted = [...strikes].sort((left, right) => left - right);
  const atTheMoneyIndex = sorted.reduce((nearestIndex, strike, index) => {
    const nearest = sorted[nearestIndex] ?? strike;

    return Math.abs(strike - underlyingPrice) <
      Math.abs(nearest - underlyingPrice)
      ? index
      : nearestIndex;
  }, 0);
  const nextIndex = Math.min(
    Math.max(atTheMoneyIndex + offset, 0),
    sorted.length - 1,
  );

  return sorted[nextIndex] ?? underlyingPrice;
}

export function optimizeStrategies(
  inputs: OptimizerInputs,
): OptimizerCandidate[] {
  const symbol = inputs.symbol.trim().toUpperCase() || "AAPL";
  const baseState = createBuilderState({ symbol });
  const chain = getBuilderChain(baseState);
  const targetPrice = targetUnderlyingPrice(inputs, chain.underlying.price);
  const strategies = THESIS_STRATEGIES[inputs.thesis];
  const candidates = new Map<string, OptimizerCandidate>();

  for (const expiration of chain.expirations) {
    const expirationIso = expiration.expiration;
    const strikes = expiration.calls.map((quote) => quote.strike);

    for (const strategy of strategies) {
      for (const input of candidateInputs(strategy)) {
        const strike = strikeAt(strikes, targetPrice, input.strikeOffset);
        const strike2 =
          input.strike2Offset === undefined
            ? undefined
            : strikeAt(strikes, targetPrice, input.strike2Offset);
        const state = createBuilderState({
          symbol,
          strategy,
          expiration: expirationIso,
          strike,
          strike2,
        });
        const candidate = makeCandidate(inputs, state);

        if (candidate) {
          candidates.set(candidate.id, candidate);
        }
      }
    }
  }

  const ranked = [...candidates.values()].sort(
    (left, right) => right.summary.score - left.summary.score,
  );
  const selected = new Map<string, OptimizerCandidate>();

  for (const strategy of strategies) {
    const bestForStrategy = ranked.find(
      (candidate) => candidate.state.strategy === strategy,
    );

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

  return [...selected.values()].sort(
    (left, right) => right.summary.score - left.summary.score,
  );
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
    capitalRequired: candidate.summary.capitalRequired,
    maxProfit: candidate.summary.maxProfit,
    maxLoss: candidate.summary.maxLoss,
    probabilityOfProfit: candidate.summary.probabilityOfProfit,
    delta: candidate.summary.delta,
    targetUnderlyingPrice: candidate.summary.targetUnderlyingPrice,
    targetProfitLoss: candidate.summary.targetProfitLoss,
    builderHref: candidate.summary.builderHref,
  }));
}
