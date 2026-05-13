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
      <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-white/60 p-6 shadow-xl backdrop-blur-xl dark:bg-white/4">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-primary/8 blur-2xl" />

        <div className="relative flex flex-wrap items-center gap-3">
          <Bar className="h-9 w-40 rounded-full" />
          <Bar className="h-5 w-20" />
          <div className="ml-auto flex items-center gap-2">
            <Bar className="h-9 w-24 rounded-full" />
            <Bar className="h-9 w-24 rounded-full" />
            <Bar className="h-9 w-24 rounded-full" />
          </div>
        </div>

        <div className="relative mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Bar className="h-2.5 w-24" />
            <Bar className="h-11 w-full rounded-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Bar className="h-2.5 w-16" />
            <Bar className="h-15.5 w-full rounded-2xl" />
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap gap-2">
          {EXPIRATION_PILLS.map(({ id, width }) => (
            <Bar key={id} className={cn("h-10 rounded-full", width)} />
          ))}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <StrategyCardSkeleton />
        <StrategyCardSkeleton />
        <StrategyCardSkeleton />
      </section>

      <span className="sr-only">Loading optimizer</span>
    </div>
  );
}

function StrategyCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col items-center gap-2">
        <Bar className="h-4 w-32" />
        <div className="flex gap-1">
          <Bar className="h-5 w-16 rounded-full" />
          <Bar className="h-5 w-16 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/30 px-4 py-3">
        <div className="flex flex-col gap-1.5">
          <Bar className="h-7 w-20" />
          <Bar className="h-2 w-16" />
          <Bar className="mt-1 h-3.5 w-16" />
          <Bar className="h-2 w-24" />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Bar className="h-7 w-16" />
          <Bar className="h-2 w-20" />
          <Bar className="mt-1 h-3.5 w-20" />
        </div>
      </div>

      <Bar className="aspect-[2.4/1] min-h-32 w-full" />

      <div className="flex items-center justify-between border-t border-border/50 pt-2">
        <Bar className="h-3 w-20" />
        <Bar className="h-8 w-28 rounded-md" />
      </div>
    </div>
  );
}
