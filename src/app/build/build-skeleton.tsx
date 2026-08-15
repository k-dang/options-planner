import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function Bar({ className }: { className?: string }) {
  return <Skeleton className={cn("rounded-md", className)} />;
}

const METRIC_TILE_KEYS = ["a", "b", "c", "d", "e"];

export function BuildSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading strategy builder"
      className="flex flex-col gap-6"
    >
      <section className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(9rem,12rem)_auto_minmax(13rem,17rem)] sm:items-end">
            <div className="flex flex-col gap-1.5">
              <Bar className="h-3 w-16" />
              <Bar className="h-9 w-full rounded-md" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Bar className="h-3 w-12" />
              <Bar className="h-9 w-36 rounded-md" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Bar className="h-3 w-20" />
              <Bar className="h-9 w-full rounded-md" />
            </div>
          </div>
        </div>
        <Bar className="h-9 w-36 self-start sm:self-auto" />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {METRIC_TILE_KEYS.map((key) => (
          <MetricTileSkeleton key={key} />
        ))}
      </section>

      <section className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
        <Bar className="mb-3 h-2.5 w-24" />
        <Bar className="h-12 w-full rounded-full" />
      </section>

      <section>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-sm">
            <Bar className="h-5 w-40" />
            <Bar className="aspect-[2.4/1] min-h-72 w-full" />
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-sm">
            <Bar className="h-5 w-32" />
            <div className="flex flex-col gap-2">
              <Bar className="h-10 w-full" />
              <Bar className="h-10 w-full" />
            </div>
          </div>
        </div>
      </section>

      <span className="sr-only">Loading strategy builder</span>
    </div>
  );
}

function MetricTileSkeleton() {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <Bar className="h-2.5 w-20" />
      <Bar className="h-6 w-24" />
    </div>
  );
}
