import { treeifyError } from "zod";
import { jsonError } from "@/lib/api-response";
import { ServiceError } from "@/modules/errors";
import { calculateStrategyFromBuilderState } from "@/modules/strategies/calculate-strategy";
import { strategyCalcRequestSchema } from "@/modules/strategies/schemas";

export async function POST(request: Request) {
  try {
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

    const data = await calculateStrategyFromBuilderState(
      parsed.data.builderState,
    );
    return Response.json({ data });
  } catch (error) {
    if (error instanceof ServiceError) {
      if (error.kind === "not-found") {
        return jsonError(404, "NOT_FOUND", error.message, error.details);
      }

      if (error.kind === "calculation") {
        return jsonError(
          400,
          "CALCULATION_ERROR",
          error.message,
          error.details,
        );
      }
    }

    console.error(error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
