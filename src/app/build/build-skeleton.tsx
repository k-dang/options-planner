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
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Bar className="h-9 w-56" />
          <Bar className="h-5 w-20 rounded-full" />
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

      <section className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <aside className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-2">
            <Bar className="h-3 w-16" />
            <Bar className="h-9 w-full rounded-md" />
            <div className="flex items-center gap-2 pt-1">
              <Bar className="h-5 w-20" />
              <Bar className="h-5 w-16 rounded-full" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Bar className="h-3 w-20" />
            <Bar className="h-9 w-full rounded-md" />
          </div>
        </aside>

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
