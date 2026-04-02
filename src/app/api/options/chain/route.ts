import { type NextRequest, NextResponse } from "next/server";
import { treeifyError } from "zod";
import { jsonError } from "@/lib/api-response";
import { getMarketDataProvider } from "@/modules/market";
import { chainQuerySchema } from "@/modules/market/schemas";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  const expiry = request.nextUrl.searchParams.get("expiry");
  const parsed = chainQuerySchema.safeParse({ symbol, expiry });
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Invalid query parameters",
      treeifyError(parsed.error),
    );
  }
  const { symbol: sym, expiry: exp } = parsed.data;
  const chain = await getMarketDataProvider().getChain(sym, exp);
  if (!chain) {
    return jsonError(
      404,
      "NOT_FOUND",
      `No option chain for symbol ${sym} and expiry ${exp}`,
    );
  }
  return NextResponse.json({ data: chain });
}
