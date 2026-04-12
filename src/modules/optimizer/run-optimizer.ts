import {
  OPTIMIZER_SENTIMENTS,
  type OptimizerSentimentKey,
} from "@/lib/optimizer-sentiments";
import { ServiceError } from "@/modules/errors";
import { getMarketDataProvider } from "@/modules/market";
import type { UnderlyingQuote } from "@/modules/market/schemas";
import { calculateStrategyAnalytics } from "@/modules/strategies/analytics";
import {
  getOptionExpiries,
  loadChainsByExpiry,
} from "@/modules/strategies/option-chains";
import { runOptimizer } from "./optimizer";
import type { OptimizerObjective, OptimizerRequest } from "./schemas";

type RunOptimizerParams = {
  symbol: string;
  targetPrice?: number;
};

const DEFAULT_OBJECTIVE: OptimizerObjective = "balanced";

export async function runOptimizerForSymbol(params: RunOptimizerParams) {
  const { symbol } = params;
  const provider = getMarketDataProvider();
  const [quote, expirations] = await Promise.all([
    provider.getQuote(symbol),
    provider.getExpirations(symbol),
  ]);

  if (!quote) {
    throw new ServiceError("not-found", `No quote for symbol: ${symbol}`);
  }

  const selectedExpiry = expirations[0] ?? null;
  if (!selectedExpiry) {
    const cardsByExpiry = {};

    return {
      quote,
      expirations,
      selectedExpiry: null,
      cards: [],
      cardsByExpiry,
    };
  }

  const optimizerChainsByExpiry = await loadChainsByExpiry({
    provider,
    symbol,
    expiries: expirations,
  });
  const cardsByExpiry = Object.fromEntries(
    expirations.map((expiry) => [
      expiry,
      {
        default: buildCardsByObjectiveForExpiry({
          symbol,
          quote,
          expiry,
          targetPrice: params.targetPrice,
          chainsByExpiry: optimizerChainsByExpiry,
        }),
        bySentiment: Object.fromEntries(
          OPTIMIZER_SENTIMENTS.map((sentiment) => [
            sentiment.key,
            buildCardsByObjectiveForExpiry({
              symbol,
              quote,
              expiry,
              targetPrice:
                Math.round(quote.last * sentiment.multiplier * 100) / 100,
              chainsByExpiry: optimizerChainsByExpiry,
            }),
          ]),
        ) as Record<
          OptimizerSentimentKey,
          ReturnType<typeof buildCardsByObjectiveForExpiry>
        >,
      },
    ]),
  );

  return {
    quote,
    expirations,
    selectedExpiry,
    cards: cardsByExpiry[selectedExpiry].default[DEFAULT_OBJECTIVE],
    cardsByExpiry,
  };
}

function buildDefaultOptimizerRequest(
  symbol: string,
  quote: UnderlyingQuote,
  targetDate: string,
  overrides?: { targetPrice?: number; objective?: OptimizerObjective },
): OptimizerRequest {
  return {
    symbol,
    targetPrice: overrides?.targetPrice ?? quote.last,
    targetDate,
    objective: overrides?.objective ?? "balanced",
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

function buildOptimizerCards(
  candidates: ReturnType<typeof runOptimizer>,
  quote: UnderlyingQuote,
  chainsByExpiry: Awaited<ReturnType<typeof loadChainsByExpiry>>,
) {
  return candidates.map((candidate) => ({
    candidate,
    detail: calculateStrategyAnalytics({
      builderState: candidate.builderState,
      quote,
      chainsByExpiry,
    }),
  }));
}

function buildCardsByObjectiveForExpiry(args: {
  symbol: string;
  quote: UnderlyingQuote;
  expiry: string;
  targetPrice?: number;
  chainsByExpiry: Awaited<ReturnType<typeof loadChainsByExpiry>>;
}) {
  const expectedProfitCandidates = selectBestCandidatesByStrategy(
    runOptimizer({
      request: buildDefaultOptimizerRequest(
        args.symbol,
        args.quote,
        args.expiry,
        {
          targetPrice: args.targetPrice,
          objective: "expectedProfit",
        },
      ),
      quote: args.quote,
      chainsByExpiry: {
        [args.expiry]: args.chainsByExpiry[args.expiry],
      },
    }),
  );
  const balancedCandidates = selectBestCandidatesByStrategy(
    runOptimizer({
      request: buildDefaultOptimizerRequest(
        args.symbol,
        args.quote,
        args.expiry,
        {
          targetPrice: args.targetPrice,
          objective: DEFAULT_OBJECTIVE,
        },
      ),
      quote: args.quote,
      chainsByExpiry: {
        [args.expiry]: args.chainsByExpiry[args.expiry],
      },
    }),
  );
  const chanceOfProfitCandidates = selectBestCandidatesByStrategy(
    runOptimizer({
      request: buildDefaultOptimizerRequest(
        args.symbol,
        args.quote,
        args.expiry,
        {
          targetPrice: args.targetPrice,
          objective: "chanceOfProfit",
        },
      ),
      quote: args.quote,
      chainsByExpiry: {
        [args.expiry]: args.chainsByExpiry[args.expiry],
      },
    }),
  );

  const requiredExpiries = [
    ...expectedProfitCandidates.flatMap((candidate) =>
      getOptionExpiries(candidate.builderState.legs),
    ),
    ...balancedCandidates.flatMap((candidate) =>
      getOptionExpiries(candidate.builderState.legs),
    ),
    ...chanceOfProfitCandidates.flatMap((candidate) =>
      getOptionExpiries(candidate.builderState.legs),
    ),
  ];
  const analyticsChainsByExpiry = Object.fromEntries(
    [...new Set(requiredExpiries)].map((expiry) => [
      expiry,
      args.chainsByExpiry[expiry],
    ]),
  );

  return {
    expectedProfit: buildOptimizerCards(
      expectedProfitCandidates,
      args.quote,
      analyticsChainsByExpiry,
    ),
    balanced: buildOptimizerCards(
      balancedCandidates,
      args.quote,
      analyticsChainsByExpiry,
    ),
    chanceOfProfit: buildOptimizerCards(
      chanceOfProfitCandidates,
      args.quote,
      analyticsChainsByExpiry,
    ),
  };
}
