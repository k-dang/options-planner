import { type NextRequest, NextResponse } from "next/server";
import { treeifyError } from "zod";
import { optimizerRequestSchema } from "@/domain";
import { runOptimizer } from "@/engine";
import { jsonError } from "@/lib/api-response";
import { getMarketDataProvider } from "@/providers";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = optimizerRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Invalid request body",
      treeifyError(parsed.error),
    );
  }

  const provider = getMarketDataProvider();
  const quote = await provider.getQuote(parsed.data.symbol);
  if (!quote) {
    return jsonError(
      404,
      "NOT_FOUND",
      `No quote for symbol: ${parsed.data.symbol}`,
    );
  }

  const targetExpiry = parsed.data.targetDate;
  const chain = await provider.getChain(parsed.data.symbol, targetExpiry);
  if (!chain) {
    return jsonError(
      404,
      "NOT_FOUND",
      `No option chain for symbol ${parsed.data.symbol} and expiry ${targetExpiry}`,
    );
  }

  const chainsByExpiry = Object.fromEntries([[targetExpiry, chain]] as const);

  const candidates = runOptimizer({
    request: parsed.data,
    quote,
    chainsByExpiry,
  });

  return NextResponse.json({ data: { candidates } });
}
