import OptimizeClient from "@/components/optimize-client";
import {
  buildOptimizerHref,
  parseOptimizerSearchParams,
} from "@/lib/optimizer-search-params";
import { loadOptimizerSnapshot } from "@/modules/optimizer/load-optimizer-snapshot";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    symbol?: string | string[] | undefined;
  }>;
}) {
  const params = await searchParams;
  const initialRequest = parseOptimizerSearchParams(params);
  const initialResult = initialRequest
    ? await loadOptimizerSnapshot(initialRequest)
    : null;
  const clientKey = initialRequest
    ? buildOptimizerHref("/", initialRequest)
    : "/";

  return (
    <OptimizeClient
      key={clientKey}
      initialRequest={initialRequest}
      initialResult={initialResult}
    />
  );
}
