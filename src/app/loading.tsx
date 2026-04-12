import { LoadingSkeleton } from "@/components/optimize/loading-skeleton";

export default function Loading() {
  return (
    <div className="grain grid-bg relative min-h-screen overflow-hidden">
      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 sm:px-8 lg:px-10">
        <div className="space-y-3">
          <div className="h-12 rounded-xl border border-white/[0.08] bg-white/[0.03]" />
          <div className="h-3 w-48 rounded bg-white/[0.05]" />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <LoadingSkeleton />
          <LoadingSkeleton delay={150} />
        </div>
      </main>
    </div>
  );
}
