import {
  createBuilderState,
  getBuilderChain,
  serializeBuilderState,
} from "./builder";
import { evaluateStrategy } from "./evaluate";
import { validateStrategyState } from "./strategy";
import type {
  OptionChainSnapshot,
  StrategyEvaluation,
  StrategyState,
  StrategyTemplateId,
} from "./types";

export type OptimizerThesis = "bullish" | "bearish" | "income";

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
  builderHref: string;
};

const THESIS_STRATEGIES: Record<OptimizerThesis, StrategyTemplateId[]> = {
  bullish: [
    "long-call",
    "bull-call-spread",
    "short-put",
    "bull-put-spread",
    "cash-secured-put",
  ],
  bearish: ["long-put", "bear-put-spread", "short-call", "bear-call-spread"],
  income: [
    "covered-call",
    "cash-secured-put",
    "iron-condor",
    "short-straddle",
    "short-strangle",
  ],
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
  inputs: OptimizerInputs,
  candidate: OptimizerCandidate,
  familyCandidates: OptimizerCandidate[],
) {
  const chanceWeight = clamp(inputs.returnChanceWeight ?? 50, 0, 100) / 100;
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
      score: 0,
      builderHref: serializeBuilderState(state),
    },
  };
}

function rankCandidatesByFamily(
  inputs: OptimizerInputs,
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
        score: candidateScore(inputs, candidate, familyCandidates),
      },
    };
  });

  return scored.sort((left, right) => right.summary.score - left.summary.score);
}

type CandidateInput = {
  strikeOffset: number;
  strike2Offset?: number;
  strike3Offset?: number;
  strike4Offset?: number;
  strikeTargetRatio?: number;
  strike2TargetRatio?: number;
  strike3TargetRatio?: number;
  strike4TargetRatio?: number;
};

function candidateInputs(strategy: StrategyTemplateId): CandidateInput[] {
  if (strategy === "long-call") {
    return [
      { strikeOffset: 0, strikeTargetRatio: 0.92 },
      { strikeOffset: 0, strikeTargetRatio: 0.94 },
      { strikeOffset: 0, strikeTargetRatio: 0.96 },
    ];
  }

  if (strategy === "bull-call-spread") {
    return [
      {
        strikeOffset: 0,
        strike2Offset: 0,
        strikeTargetRatio: 0.94,
        strike2TargetRatio: 1.01,
      },
      {
        strikeOffset: 0,
        strike2Offset: 0,
        strikeTargetRatio: 0.96,
        strike2TargetRatio: 1.03,
      },
    ];
  }

  if (strategy === "bear-put-spread") {
    return [
      { strikeOffset: 1, strike2Offset: -1 },
      { strikeOffset: 0, strike2Offset: -2 },
    ];
  }

  if (strategy === "bull-put-spread") {
    return [
      {
        strikeOffset: 0,
        strike2Offset: 0,
        strikeTargetRatio: 0.95,
        strike2TargetRatio: 0.92,
      },
      {
        strikeOffset: 0,
        strike2Offset: 0,
        strikeTargetRatio: 0.97,
        strike2TargetRatio: 0.94,
      },
    ];
  }

  if (strategy === "bear-call-spread") {
    return [
      { strikeOffset: 1, strike2Offset: 3 },
      { strikeOffset: 0, strike2Offset: 2 },
    ];
  }

  if (strategy === "iron-condor") {
    return [
      {
        strikeOffset: -3,
        strike2Offset: -1,
        strike3Offset: 1,
        strike4Offset: 3,
      },
      {
        strikeOffset: -4,
        strike2Offset: -2,
        strike3Offset: 2,
        strike4Offset: 4,
      },
    ];
  }

  if (strategy === "covered-call") {
    return [{ strikeOffset: 1 }, { strikeOffset: 2 }, { strikeOffset: 3 }];
  }

  if (strategy === "cash-secured-put" || strategy === "short-put") {
    return [
      { strikeOffset: 0, strikeTargetRatio: 0.9 },
      { strikeOffset: 0, strikeTargetRatio: 0.92 },
      { strikeOffset: 0, strikeTargetRatio: 0.95 },
    ];
  }

  if (strategy === "short-call") {
    return [{ strikeOffset: 1 }, { strikeOffset: 2 }, { strikeOffset: 3 }];
  }

  if (strategy === "short-strangle") {
    return [
      { strikeOffset: -2, strike2Offset: 2 },
      { strikeOffset: -3, strike2Offset: 3 },
    ];
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

function strikeForInput(
  strikes: number[],
  targetPrice: number,
  input: CandidateInput,
  offsetKey: keyof Pick<
    CandidateInput,
    "strikeOffset" | "strike2Offset" | "strike3Offset" | "strike4Offset"
  >,
  ratioKey: keyof Pick<
    CandidateInput,
    | "strikeTargetRatio"
    | "strike2TargetRatio"
    | "strike3TargetRatio"
    | "strike4TargetRatio"
  >,
) {
  const offset = input[offsetKey];

  if (offset === undefined) {
    return undefined;
  }

  const anchorPrice = targetPrice * (input[ratioKey] ?? 1);

  return strikeAt(strikes, anchorPrice, offset);
}

export function optimizeStrategies(
  inputs: OptimizerInputs,
  chainInput?: OptionChainSnapshot,
): OptimizerCandidate[] {
  const symbol = inputs.symbol.trim().toUpperCase() || "AAPL";
  const chain = chainInput ?? getBuilderChain(createBuilderState({ symbol }));
  const targetPrice = targetUnderlyingPrice(inputs, chain.underlying.price);
  const strategies = THESIS_STRATEGIES[inputs.thesis];
  const candidates = new Map<string, OptimizerCandidate>();

  for (const expirationGroup of chain.expirations) {
    const expirationIso = expirationGroup.expiration;

    if (
      inputs.expiration !== undefined &&
      expirationIso !== inputs.expiration
    ) {
      continue;
    }

    const strikes = expirationGroup.calls.map((quote) => quote.strike);

    for (const strategy of strategies) {
      for (const input of candidateInputs(strategy)) {
        const strike = strikeForInput(
          strikes,
          targetPrice,
          input,
          "strikeOffset",
          "strikeTargetRatio",
        );
        const strike2 = strikeForInput(
          strikes,
          targetPrice,
          input,
          "strike2Offset",
          "strike2TargetRatio",
        );
        const state = createBuilderState({
          symbol,
          strategy,
          expiration: expirationIso,
          strike,
          strike2,
          strike3: strikeForInput(
            strikes,
            targetPrice,
            input,
            "strike3Offset",
            "strike3TargetRatio",
          ),
          strike4: strikeForInput(
            strikes,
            targetPrice,
            input,
            "strike4Offset",
            "strike4TargetRatio",
          ),
          chain,
        });
        const candidate = makeCandidate(inputs, state);

        if (candidate) {
          candidates.set(candidate.id, candidate);
        }
      }
    }
  }

  const ranked = rankCandidatesByFamily(inputs, [...candidates.values()]);
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
    builderHref: candidate.summary.builderHref,
  }));
}
