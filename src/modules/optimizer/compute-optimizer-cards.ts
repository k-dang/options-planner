import type { OptionChain, UnderlyingQuote } from "@/modules/market/schemas";
import { calculateStrategyAnalytics } from "@/modules/strategies/analytics";
import { getOptionExpiries } from "@/modules/strategies/option-chains";
import { runOptimizer } from "./optimizer";
import type {
  OptimizerObjective,
  OptimizerRequest,
  OptimizerRunResponse,
} from "./schemas";

export type OptimizerDataset = {
  quote: UnderlyingQuote;
  expirations: string[];
  chainsByExpiry: Record<string, OptionChain>;
};

export type OptimizerCardsRequest = {
  symbol: string;
  targetPrice: number;
  targetDate: string;
  objective: OptimizerObjective;
  maxLoss?: number;
};

export function computeOptimizerCards(args: {
  dataset: OptimizerDataset;
  request: OptimizerCardsRequest;
}) {
  const { dataset, request } = args;
  const selectedChain = dataset.chainsByExpiry[request.targetDate];

  if (!selectedChain) {
    return [] satisfies OptimizerRunResponse["data"]["cards"];
  }

  const candidates = runOptimizer({
    request: buildOptimizerRequest(dataset.quote, request),
    quote: dataset.quote,
    chainsByExpiry: {
      [request.targetDate]: selectedChain,
    },
  });
  const bestCandidatesByStrategy = selectBestCandidatesByStrategy(candidates);
  const requiredExpiries = [
    ...new Set(
      bestCandidatesByStrategy.flatMap((candidate) =>
        getOptionExpiries(candidate.builderState.legs),
      ),
    ),
  ];
  const analyticsChainsByExpiry = Object.fromEntries(
    requiredExpiries.flatMap((expiry) => {
      const chain = dataset.chainsByExpiry[expiry];
      return chain ? [[expiry, chain] as const] : [];
    }),
  );

  return bestCandidatesByStrategy.map((candidate) => ({
    candidate,
    detail: calculateStrategyAnalytics({
      builderState: candidate.builderState,
      quote: dataset.quote,
      chainsByExpiry: analyticsChainsByExpiry,
    }),
  }));
}

function buildOptimizerRequest(
  _quote: UnderlyingQuote,
  request: OptimizerCardsRequest,
): OptimizerRequest {
  return {
    symbol: request.symbol,
    targetPrice: request.targetPrice,
    targetDate: request.targetDate,
    objective: request.objective,
    maxLoss: request.maxLoss,
    maxLegs: 2,
    strikeWindow: 2,
    horizonDays: 30,
    riskFreeRate: 0.04,
    commissions: { perContract: 0.65, perLegFee: 0.1 },
    ivOverrides: { byExpiry: {} },
    grid: { pricePoints: 7, datePoints: 3, priceRangePct: 0.25 },
  };
}

function selectBestCandidatesByStrategy(
  candidates: ReturnType<typeof runOptimizer>,
) {
  const bestByStrategy = new Map<string, (typeof candidates)[number]>();

  for (const candidate of candidates) {
    if (!bestByStrategy.has(candidate.strategyName)) {
      bestByStrategy.set(candidate.strategyName, candidate);
    }
  }

  return Array.from(bestByStrategy.values());
}
