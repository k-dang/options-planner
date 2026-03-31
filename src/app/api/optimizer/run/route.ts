import { type NextRequest, NextResponse } from "next/server";
import { treeifyError } from "zod";
import { optimizerRunRequestSchema } from "@/domain";
import { calculateStrategyAnalytics, runOptimizer } from "@/engine";
import { jsonError } from "@/lib/api-response";
import { getMarketDataProvider } from "@/providers";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = optimizerRunRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Invalid request body",
      treeifyError(parsed.error),
    );
  }

  const provider = getMarketDataProvider();
  const symbol = parsed.data.symbol;
  const [quote, expirations] = await Promise.all([
    provider.getQuote(symbol),
    provider.getExpirations(symbol),
  ]);

  if (!quote) {
    return jsonError(404, "NOT_FOUND", `No quote for symbol: ${symbol}`);
  }

  const targetExpiry = expirations[0] ?? null;
  if (!targetExpiry) {
    return NextResponse.json({
      data: {
        quote,
        selectedExpiry: null,
        cards: [],
      },
    });
  }

  const chain = await provider.getChain(symbol, targetExpiry);
  if (!chain) {
    return jsonError(
      404,
      "NOT_FOUND",
      `No option chain for symbol ${symbol} and expiry ${targetExpiry}`,
    );
  }

  const chainsByExpiry = Object.fromEntries([[targetExpiry, chain]] as const);

  const candidates = runOptimizer({
    request: {
      symbol,
      targetPrice: quote.last,
      targetDate: targetExpiry,
      objective: "expectedProfit",
      maxLegs: 2,
      strikeWindow: 2,
      horizonDays: 30,
      riskFreeRate: 0.04,
      commissions: { perContract: 0.65, perLegFee: 0.1 },
      ivOverrides: { byExpiry: {} },
      grid: { pricePoints: 7, datePoints: 3, priceRangePct: 0.25 },
    },
    quote,
    chainsByExpiry,
  });

  const bestByStrategy = Object.values(
    Object.fromEntries(
      candidates.map((candidate) => [candidate.strategyName, candidate]),
    ),
  );

  const expiriesToLoad = [
    ...new Set(bestByStrategy.flatMap(getOptionExpiries)),
  ];
  const extraChains = await Promise.all(
    expiriesToLoad
      .filter((expiry) => !(expiry in chainsByExpiry))
      .map(async (expiry) => ({
        expiry,
        chain: await provider.getChain(symbol, expiry),
      })),
  );

  const missingExpiry = extraChains.find((item) => item.chain === null)?.expiry;
  if (missingExpiry) {
    return jsonError(
      404,
      "NOT_FOUND",
      `No option chain for symbol ${symbol} and expiry ${missingExpiry}`,
    );
  }

  const analyticsChainsByExpiry = {
    ...chainsByExpiry,
    ...Object.fromEntries(
      extraChains
        .map((item) => [item.expiry, item.chain])
        .filter((item) => item[1]),
    ),
  };

  const cards = bestByStrategy.map((candidate) => ({
    candidate,
    detail: calculateStrategyAnalytics({
      builderState: candidate.builderState,
      quote,
      chainsByExpiry: analyticsChainsByExpiry,
    }),
  }));

  return NextResponse.json({
    data: {
      quote,
      selectedExpiry: targetExpiry,
      cards,
    },
  });
}

function getOptionExpiries(candidate: {
  builderState: {
    legs: Array<{
      kind: "option" | "stock";
      expiry?: string;
    }>;
  };
}) {
  return candidate.builderState.legs
    .filter((leg) => leg.kind === "option")
    .map((leg) => leg.expiry)
    .filter((expiry): expiry is string => Boolean(expiry));
}
