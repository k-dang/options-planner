import { type NextRequest, NextResponse } from "next/server";
import { treeifyError } from "zod";
import { strategyCalcRequestSchema } from "@/domain";
import { calculateStrategyAnalytics } from "@/engine";
import { jsonError } from "@/lib/api-response";
import { getMarketDataProvider } from "@/providers";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = strategyCalcRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Invalid request body",
      treeifyError(parsed.error),
    );
  }

  const { builderState } = parsed.data;
  const provider = getMarketDataProvider();
  const quote = await provider.getQuote(builderState.symbol);
  if (!quote) {
    return jsonError(
      404,
      "NOT_FOUND",
      `No quote for symbol: ${builderState.symbol}`,
    );
  }

  const expiries = [
    ...new Set(
      builderState.legs
        .filter((leg) => leg.kind === "option")
        .map((leg) => leg.expiry)
        .filter((expiry): expiry is string => Boolean(expiry)),
    ),
  ];

  const chains = await Promise.all(
    expiries.map(async (expiry) => ({
      expiry,
      chain: await provider.getChain(builderState.symbol, expiry),
    })),
  );

  const missingExpiry = chains.find((item) => item.chain === null)?.expiry;
  if (missingExpiry) {
    return jsonError(
      404,
      "NOT_FOUND",
      `No option chain for symbol ${builderState.symbol} and expiry ${missingExpiry}`,
    );
  }

  const chainsByExpiry = Object.fromEntries(
    chains
      .filter(
        (
          item,
        ): item is {
          expiry: string;
          chain: NonNullable<(typeof chains)[number]["chain"]>;
        } => item.chain !== null,
      )
      .map((item) => [item.expiry, item.chain]),
  );

  try {
    const data = calculateStrategyAnalytics({
      builderState,
      quote,
      chainsByExpiry,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(
      400,
      "CALCULATION_ERROR",
      error instanceof Error ? error.message : "Strategy calculation failed",
    );
  }
}
