import { treeifyError } from "zod";
import { optimizerRunRequestSchema } from "@/domain";
import { jsonError } from "@/lib/api-response";
import { runOptimizerForSymbol } from "@/server/optimizer-service";
import { ServiceError } from "@/server/service-errors";

export async function POST(request: Request) {
  try {
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

    const data = await runOptimizerForSymbol(parsed.data.symbol);
    return Response.json({ data });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(404, "NOT_FOUND", error.message, error.details);
    }

    console.error(error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
