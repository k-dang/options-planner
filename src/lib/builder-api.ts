import type { OptionIndex } from "@/modules/market/schemas";
import type {
  BuilderStateInput,
  StrategyCalcResponse,
} from "@/modules/strategies/schemas";

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

type OptionIndexResponse = {
  data: OptionIndex;
};

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

  return (await response.json()) as StrategyCalcResponse;
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

  const body = (await response.json()) as OptionIndexResponse;
  return body.data;
}

async function getErrorMessage(response: Response) {
  const body = (await response
    .json()
    .catch(() => null)) as ApiErrorResponse | null;
  return body?.error?.message ?? null;
}
