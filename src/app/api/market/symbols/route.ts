import { type NextRequest, NextResponse } from "next/server";
import { treeifyError } from "zod";
import { symbolsQuerySchema } from "@/domain/market";
import { jsonError } from "@/lib/api-response";
import { getMarketDataProvider } from "@/providers";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const parsed = symbolsQuerySchema.safeParse({ q });
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Invalid query parameters",
      treeifyError(parsed.error),
    );
  }
  const data = await getMarketDataProvider().searchSymbols(parsed.data.q);
  return NextResponse.json({ data });
}
