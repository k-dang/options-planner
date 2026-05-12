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
import {
  POSITIONS_TABLE_CLASS,
  PositionsTableColGroup,
} from "./positions-table-layout";

const ROWS = [
  {
    id: "row-a",
    name: "w-44",
    sub: "w-28",
    pl: "w-20",
    pct: "w-12",
    created: "w-32",
    dte: "w-6",
    marked: "w-28",
  },
  {
    id: "row-b",
    name: "w-36",
    sub: "w-32",
    pl: "w-16",
    pct: "w-10",
    created: "w-32",
    dte: "w-8",
    marked: "w-24",
  },
  {
    id: "row-c",
    name: "w-48",
    sub: "w-24",
    pl: "w-24",
    pct: "w-14",
    created: "w-32",
    dte: "w-5",
    marked: "w-28",
  },
  {
    id: "row-d",
    name: "w-32",
    sub: "w-28",
    pl: "w-20",
    pct: "w-12",
    created: "w-32",
    dte: "w-7",
    marked: "w-20",
  },
  {
    id: "row-e",
    name: "w-40",
    sub: "w-32",
    pl: "w-16",
    pct: "w-12",
    created: "w-32",
    dte: "w-6",
    marked: "w-28",
  },
];

function Bar({ className }: { className?: string }) {
  return <Skeleton className={cn("rounded-sm", className)} />;
}

export function PositionsSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading saved strategies"
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <Table className={POSITIONS_TABLE_CLASS}>
        <PositionsTableColGroup />
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Total Return</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Days To Expiration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Marked</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROWS.map((row) => (
            <TableRow key={row.id} className="hover:bg-transparent">
              <TableCell>
                <div className="flex flex-col gap-1.5">
                  <Bar className={cn("h-3.5", row.name)} />
                  <Bar className={cn("h-2.5", row.sub)} />
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1.5">
                  <Bar className={cn("h-3.5", row.pl)} />
                  <Bar className={cn("h-2.5", row.pct)} />
                </div>
              </TableCell>
              <TableCell>
                <Bar className={cn("h-3", row.created)} />
              </TableCell>
              <TableCell>
                <Bar className={cn("h-3", row.dte)} />
              </TableCell>
              <TableCell>
                <Bar className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell>
                <Bar className={cn("h-3", row.marked)} />
              </TableCell>
              <TableCell>
                <Bar className="h-9 w-28 rounded-full" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <span className="sr-only">Loading saved strategies</span>
    </div>
  );
}
