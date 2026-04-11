import { getErrorMessage, parseJsonResponse } from "@/lib/fetch-json";
import { optionIndexResponseSchema } from "@/modules/market/schemas";
import {
  type BuilderStateInput,
  strategyCalcResponseSchema,
} from "@/modules/strategies/schemas";

export async function calculateStrategy(builderState: BuilderStateInput) {
  const response = await fetch("/api/strategies/calc", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ builderState }),
  });

  if (!response.ok) {
    throw new Error(
      (await getErrorMessage(response)) || "Unable to calculate strategy.",
    );
  }

  const parsed = await parseJsonResponse(response, strategyCalcResponseSchema);
  if (!parsed.ok) {
    throw new Error("Received an invalid strategy response.");
  }

  return parsed.data.data;
}

export async function getOptionsMetadata(symbol: string) {
  const response = await fetch(
    `/api/options/metadata?symbol=${encodeURIComponent(symbol)}`,
  );

  if (!response.ok) {
    throw new Error(
      (await getErrorMessage(response)) || "Unable to load option metadata.",
    );
  }

  const parsed = await parseJsonResponse(response, optionIndexResponseSchema);
  if (!parsed.ok) {
    throw new Error("Received an invalid option metadata response.");
  }

  return parsed.data.data;
}
