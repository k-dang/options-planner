import { type NextRequest, NextResponse } from "next/server";
import { treeifyError } from "zod";
import { jsonError } from "@/lib/api-response";
import { getOptionMetadata } from "@/modules/market";
import { symbolParamSchema } from "@/modules/market/schemas";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  const parsed = symbolParamSchema.safeParse({ symbol });
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Invalid query parameters",
      treeifyError(parsed.error),
    );
  }

  const data = await getOptionMetadata(parsed.data.symbol);
  return NextResponse.json({ data });
}
