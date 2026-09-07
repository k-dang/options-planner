import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const POSITIONS_TABLE_CLASS = "min-w-[60rem] table-fixed";

export function PositionsTableColGroup() {
  return (
    <colgroup>
      <col />
      <col className="w-32" />
      <col className="w-44" />
      <col className="w-44" />
      <col className="w-24" />
      <col className="w-36" />
      <col className="w-36" />
    </colgroup>
  );
}

export function PositionsTableHead() {
  return (
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
  );
}
