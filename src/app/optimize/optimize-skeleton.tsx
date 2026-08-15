import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function Bar({ className }: { className?: string }) {
  return <Skeleton className={cn("rounded-md", className)} />;
}

const MONTH_PILLS = [
  { id: "month-a", width: "w-40" },
  { id: "month-b", width: "w-28" },
  { id: "month-c", width: "w-16" },
  { id: "month-d", width: "w-16" },
  { id: "month-e", width: "w-16" },
  { id: "month-f", width: "w-16" },
];

const DAY_DOTS = Array.from({ length: 14 }, (_, i) => `day-${i}`);

export function OptimizeSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading optimizer"
      className="flex flex-col"
    >
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

export function OptimizeIdentitySkeleton() {
  return (
    <>
      <Bar className="h-9 w-40 rounded-full" />
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Last
        </span>
        <Bar className="h-5 w-20" />
      </div>
    </>
  );
}

export function OptimizeTargetSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground">
        Target Price at Expiration
      </span>
      <Bar className="h-9 w-full rounded-full" />
      <Bar className="h-3 w-56" />
    </div>
  );
}

export function OptimizeExpirationSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Expiration
        </span>
        <Bar className="h-5 w-20 rounded-full" />
      </div>
      <div className="flex gap-1 overflow-hidden">
        {MONTH_PILLS.map(({ id, width }) => (
          <Bar key={id} className={cn("h-6 shrink-0 rounded-full", width)} />
        ))}
      </div>
      <div className="flex justify-between gap-1 overflow-hidden">
        {DAY_DOTS.map((id) => (
          <Bar key={id} className="size-7 shrink-0 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export function OptimizeSnapshotSkeleton() {
  return (
    <div className="mt-5 flex flex-wrap justify-between gap-2 border-t border-border/70 pt-3">
      <Bar className="h-3 w-72" />
      <p className="text-xs leading-5 text-muted-foreground">
        Model estimates support planning; they are not guarantees.
      </p>
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
