import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function Bar({ className }: { className?: string }) {
  return <Skeleton className={cn("rounded-md", className)} />;
}

const EXPIRATION_PILLS = [
  { id: "exp-a", width: "w-16" },
  { id: "exp-b", width: "w-20" },
  { id: "exp-c", width: "w-14" },
  { id: "exp-d", width: "w-20" },
  { id: "exp-e", width: "w-16" },
  { id: "exp-f", width: "w-20" },
  { id: "exp-g", width: "w-14" },
];

export function OptimizeSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading optimizer"
      className="flex flex-col gap-6"
    >
      <section className="rounded-xl bg-card p-5 ring-1 ring-border">
        <div className="flex flex-wrap items-center gap-3">
          <Bar className="h-9 w-40 rounded-full" />
          <Bar className="h-5 w-20" />
          <div className="ml-auto flex items-center gap-2">
            <Bar className="h-9 w-24 rounded-full" />
            <Bar className="h-9 w-24 rounded-full" />
            <Bar className="h-9 w-24 rounded-full" />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Bar className="h-3 w-40" />
            <Bar className="h-9 w-full rounded-full" />
            <Bar className="h-3 w-56" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Bar className="h-3 w-20" />
            <Bar className="h-12 w-full rounded-lg" />
            <Bar className="h-3 w-64" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {EXPIRATION_PILLS.map(({ id, width }) => (
            <Bar key={id} className={cn("h-10 rounded-full", width)} />
          ))}
        </div>

        <div className="mt-5 flex flex-wrap justify-between gap-2 border-t border-border/70 pt-3">
          <Bar className="h-3 w-72" />
          <Bar className="h-3 w-64" />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <Bar className="h-4 w-28" />
            <Bar className="h-3 w-56" />
          </div>
          <Bar className="h-3 w-64" />
        </div>
        <div className="border-t border-border pt-4">
          <div className="mb-3 flex flex-wrap justify-between gap-3">
            <div className="space-y-2">
              <Bar className="h-5 w-40" />
              <Bar className="h-3 w-56" />
            </div>
            <Bar className="h-3 w-80" />
          </div>
          <StrategyCardSkeleton featured />
        </div>
        <div className="space-y-3">
          <Bar className="h-4 w-32" />
          <div className="grid gap-4 md:grid-cols-2">
            <StrategyCardSkeleton />
            <StrategyCardSkeleton />
            <StrategyCardSkeleton />
            <StrategyCardSkeleton />
          </div>
        </div>
      </section>

      <span className="sr-only">Loading optimizer</span>
    </div>
  );
}

function StrategyCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-card p-6 ring-1 ring-border">
      <div
        className={cn(
          "flex flex-col gap-2",
          featured ? "items-start" : "items-center",
        )}
      >
        <Bar className="h-4 w-32" />
        <div className="flex gap-1">
          <Bar className="h-5 w-16 rounded-full" />
          <Bar className="h-5 w-16 rounded-full" />
        </div>
      </div>

      <div
        className={cn(
          "gap-4",
          featured &&
            "lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(380px,1.2fr)]",
        )}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/30 px-4 py-3">
            <div className="flex flex-col gap-1.5">
              <Bar className="h-7 w-20" />
              <Bar className="h-3 w-16" />
              <Bar className="mt-1 h-3.5 w-24" />
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Bar className="h-7 w-16" />
              <Bar className="h-3 w-28" />
              <Bar className="mt-1 h-3.5 w-24" />
            </div>
          </div>
          <Bar className="h-3 w-64" />
        </div>
        <Bar
          className={cn(
            "mt-4 aspect-[2.4/1] min-h-32 w-full",
            featured && "lg:mt-0 lg:h-56 lg:aspect-auto",
          )}
        />
      </div>

      <div className="flex items-center justify-between border-t border-border/50 pt-2">
        <Bar className="h-3 w-20" />
        <Bar className="h-8 w-28 rounded-md" />
      </div>
    </div>
  );
}
