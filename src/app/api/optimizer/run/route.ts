import { treeifyError } from "zod";
import { jsonError } from "@/lib/api-response";
import { ServiceError } from "@/modules/errors";
import { runOptimizerForSymbol } from "@/modules/optimizer/run-optimizer";
import { optimizerRunRequestSchema } from "@/modules/optimizer/schemas";

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

    const data = await runOptimizerForSymbol(parsed.data);
    return Response.json({ data });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(404, "NOT_FOUND", error.message, error.details);
    }

    console.error(error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
