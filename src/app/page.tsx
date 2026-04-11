import OptimizeClient from "@/components/optimize-client";
import { loadOptimizerSnapshot } from "@/modules/optimizer/load-optimizer-snapshot";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const rawSymbol = params.symbol;
  const initialSymbol = Array.isArray(rawSymbol) ? rawSymbol[0] : rawSymbol;
  const normalizedInitialSymbol = initialSymbol?.trim().toUpperCase() ?? "";
  const initialResult =
    normalizedInitialSymbol.length > 0
      ? await loadOptimizerSnapshot({ symbol: normalizedInitialSymbol })
      : null;

  return (
    <OptimizeClient
      initialSymbol={normalizedInitialSymbol}
      initialResult={initialResult}
    />
  );
}
