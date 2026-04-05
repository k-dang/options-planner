import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="animate-card-in overflow-hidden rounded-2xl border border-white/[0.06] bg-[oklch(0.14_0.008_260)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-56 w-full rounded-lg" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
