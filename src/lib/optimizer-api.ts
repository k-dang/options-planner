import type { SymbolSearchResult } from "@/modules/market/schemas";
import type {
  OptimizerObjective,
  OptimizerRunResponse,
} from "@/modules/optimizer/schemas";

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

type SearchSymbolsResponse = {
  data: SymbolSearchResult[];
};

export async function searchSymbols(query: string) {
  const response = await fetch(
    `/api/market/symbols?q=${encodeURIComponent(query)}`,
  );

  if (!response.ok) {
    return [];
  }

  const body = (await response.json()) as SearchSymbolsResponse;
  return body.data;
}

export async function runOptimizer(input: {
  symbol: string;
  targetPrice?: number;
  targetDate?: string;
  objective?: OptimizerObjective;
  maxLoss?: number;
}) {
  const response = await fetch("/api/optimizer/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return {
      ok: false as const,
      error:
        (await getErrorMessage(response)) || "Unable to optimize strategies.",
    };
  }

  return {
    ok: true as const,
    data: (await response.json()) as OptimizerRunResponse,
  };
}

async function getErrorMessage(response: Response) {
  const body = (await response
    .json()
    .catch(() => null)) as ApiErrorResponse | null;
  return body?.error?.message ?? null;
}
