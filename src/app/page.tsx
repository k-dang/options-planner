import OptimizeClient from "@/components/optimize-client";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const rawSymbol = params.symbol;
  const initialSymbol = Array.isArray(rawSymbol) ? rawSymbol[0] : rawSymbol;

  return <OptimizeClient initialSymbol={initialSymbol ?? ""} />;
}
