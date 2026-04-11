import { getErrorMessage, parseJsonResponse } from "@/lib/fetch-json";
import { symbolSearchResponseSchema } from "@/modules/market/schemas";
import type {
  OptimizerObjective,
  OptimizerRunResponse,
} from "@/modules/optimizer/schemas";
import { optimizerRunResponseSchema } from "@/modules/optimizer/schemas";

type RunOptimizerResult =
  | {
      ok: false;
      error: string;
    }
  | {
      ok: true;
      data: OptimizerRunResponse;
    };

export async function searchSymbols(query: string) {
  const response = await fetch(
    `/api/market/symbols?q=${encodeURIComponent(query)}`,
  );

  if (!response.ok) {
    return [];
  }

  const parsed = await parseJsonResponse(response, symbolSearchResponseSchema);
  if (!parsed.ok) {
    return [];
  }

  return parsed.data.data;
}

export async function runOptimizer(input: {
  symbol: string;
  targetPrice?: number;
  targetDate?: string;
  objective?: OptimizerObjective;
  maxLoss?: number;
}): Promise<RunOptimizerResult> {
  const response = await fetch("/api/optimizer/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return {
      ok: false,
      error:
        (await getErrorMessage(response)) || "Unable to optimize strategies.",
    };
  }

  const parsed = await parseJsonResponse(response, optimizerRunResponseSchema);
  if (!parsed.ok) {
    return {
      ok: false,
      error:
        parsed.error === "malformed-json"
          ? "Received malformed JSON from the optimizer."
          : "Received an invalid optimizer response.",
    };
  }

  return {
    ok: true,
    data: parsed.data,
  };
}
