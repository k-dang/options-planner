import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function Bar({ className }: { className?: string }) {
  return <Skeleton className={cn("rounded-md", className)} />;
}

const STRATEGY_PILLS = [
  { id: "pill-a", width: "w-20" },
  { id: "pill-b", width: "w-24" },
  { id: "pill-c", width: "w-24" },
  { id: "pill-d", width: "w-28" },
  { id: "pill-e", width: "w-20" },
  { id: "pill-f", width: "w-24" },
  { id: "pill-g", width: "w-28" },
  { id: "pill-h", width: "w-20" },
  { id: "pill-i", width: "w-28" },
  { id: "pill-j", width: "w-24" },
];

const ROWS = [
  {
    id: "row-a",
    strat: "w-28",
    strike: "w-24",
    profit: "w-16",
    loss: "w-14",
    ror: "w-12",
  },
  {
    id: "row-b",
    strat: "w-24",
    strike: "w-28",
    profit: "w-14",
    loss: "w-16",
    ror: "w-14",
  },
  {
    id: "row-c",
    strat: "w-32",
    strike: "w-20",
    profit: "w-16",
    loss: "w-12",
    ror: "w-12",
  },
  {
    id: "row-d",
    strat: "w-28",
    strike: "w-32",
    profit: "w-12",
    loss: "w-16",
    ror: "w-14",
  },
  {
    id: "row-e",
    strat: "w-24",
    strike: "w-24",
    profit: "w-14",
    loss: "w-14",
    ror: "w-10",
  },
];

export function ScanSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading scanner"
      className="flex flex-col gap-6"
    >
      <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-white/60 p-6 shadow-xl backdrop-blur-xl dark:bg-white/4">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/12 blur-3xl" />

        <div className="relative flex flex-wrap items-center gap-3">
          <Bar className="h-9 w-40 rounded-full" />
          <Bar className="h-4 w-20" />
          <Bar className="ml-auto h-3 w-20" />
        </div>

        <div className="relative mt-5 grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Bar className="h-2.5 w-48" />
            <Bar className="h-[58px] w-full rounded-2xl" />
          </div>
          <div className="flex flex-col gap-2">
            <Bar className="h-2.5 w-44" />
            <Bar className="h-[58px] w-full rounded-2xl" />
          </div>
        </div>

        <div className="relative mt-5">
          <Bar className="mb-2 h-2.5 w-20" />
          <div className="flex flex-wrap gap-2">
            {STRATEGY_PILLS.map(({ id, width }) => (
              <Bar key={id} className={cn("h-7", width)} />
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead>
                <Bar className="h-3 w-20" />
              </TableHead>
              <TableHead>
                <Bar className="h-3 w-20" />
              </TableHead>
              <TableHead>
                <Bar className="h-3 w-16" />
              </TableHead>
              <TableHead className="text-right">
                <Bar className="ml-auto h-3 w-12" />
              </TableHead>
              <TableHead className="text-right">
                <Bar className="ml-auto h-3 w-20" />
              </TableHead>
              <TableHead className="text-right">
                <Bar className="ml-auto h-3 w-20" />
              </TableHead>
              <TableHead className="text-right">
                <Bar className="ml-auto h-3 w-24" />
              </TableHead>
              <TableHead className="text-right">
                <Bar className="ml-auto h-3 w-24" />
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((row) => (
              <TableRow key={row.id} className="hover:bg-transparent">
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    <Bar className={cn("h-3.5", row.strat)} />
                    <Bar className="h-4 w-14 rounded-full" />
                  </div>
                </TableCell>
                <TableCell>
                  <Bar className="h-3 w-20" />
                </TableCell>
                <TableCell>
                  <Bar className={cn("h-3", row.strike)} />
                </TableCell>
                <TableCell className="text-right">
                  <Bar className="ml-auto h-3 w-12" />
                </TableCell>
                <TableCell className="text-right">
                  <Bar className={cn("ml-auto h-3", row.profit)} />
                </TableCell>
                <TableCell className="text-right">
                  <Bar className={cn("ml-auto h-3", row.loss)} />
                </TableCell>
                <TableCell className="text-right">
                  <Bar className={cn("ml-auto h-3.5", row.ror)} />
                </TableCell>
                <TableCell className="text-right">
                  <Bar className="ml-auto h-3 w-12" />
                </TableCell>
                <TableCell className="text-right">
                  <Bar className="ml-auto h-8 w-16" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-border/50 px-4 py-2">
          <Bar className="h-3 w-36" />
          <div className="flex items-center gap-2">
            <Bar className="h-7 w-20" />
            <Bar className="h-3 w-12" />
            <Bar className="h-7 w-16" />
          </div>
        </div>
      </section>

      <span className="sr-only">Loading scanner</span>
    </div>
  );
}
