import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCurrency,
  formatDateTime,
  formatPercent,
  formatShortDateTime,
  formatTitleCaseFromKebab,
} from "@/lib/format";
import {
  listSavedStrategies,
  type SavedStrategyListItem,
} from "@/lib/saved-strategies";
import { cn } from "@/lib/utils";
import { DevSkeletonToggle } from "./dev-skeleton-toggle";
import { PositionActions, RefreshAllPositionsButton } from "./position-actions";
import { PositionsSkeleton } from "./positions-skeleton";
import {
  POSITIONS_TABLE_CLASS,
  PositionsTableColGroup,
} from "./positions-table-layout";

const IS_DEV = process.env.NODE_ENV === "development";

export default function PositionsPage() {
  const body = (
    <Suspense fallback={<PositionsSkeleton />}>
      <PositionsContent />
    </Suspense>
  );

  return (
    <main className="flex-1 bg-background px-6 py-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
              Saved Strategies
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Positions
            </h1>
          </div>
          <RefreshAllPositionsButton />
        </div>

        {IS_DEV ? (
          <DevSkeletonToggle skeleton={<PositionsSkeleton />}>
            {body}
          </DevSkeletonToggle>
        ) : (
          body
        )}
      </section>
    </main>
  );
}

async function PositionsContent() {
  const strategies = await listSavedStrategies();

  return (
    <>
      {strategies.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
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
              {strategies.map((strategy) => (
                <PositionRow key={strategy.id} strategy={strategy} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}

function PositionRow({ strategy }: { strategy: SavedStrategyListItem }) {
  const snapshot = strategy.latestSnapshot;

  return (
    <TableRow
      className={cn(
        strategy.displayStatus === "closed" &&
          "bg-muted/20 text-muted-foreground",
        strategy.displayStatus === "expired" &&
          "bg-destructive/5 text-muted-foreground",
      )}
    >
      <TableCell>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-medium text-foreground">
            {strategy.name}
          </span>
          <span className="truncate font-mono text-xs text-muted-foreground">
            {strategy.symbol} ·{" "}
            {formatTitleCaseFromKebab(strategy.strategyType)}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <TotalReturn strategy={strategy} />
      </TableCell>
      <TableCell>{formatDateTime(strategy.createdAt)}</TableCell>
      <TableCell>
        {strategy.daysUntilExpiration === null
          ? "n/a"
          : strategy.daysUntilExpiration < 0
            ? "Expired"
            : strategy.daysUntilExpiration}
      </TableCell>
      <TableCell>
        <StatusBadge status={strategy.displayStatus} />
      </TableCell>
      <TableCell>
        {snapshot ? (
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatShortDateTime(snapshot.observedAt)}
          </span>
        ) : (
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground/60">
            Never
          </span>
        )}
      </TableCell>
      <TableCell>
        <PositionActions
          id={strategy.id}
          name={strategy.name}
          disabled={strategy.displayStatus !== "open"}
        />
      </TableCell>
    </TableRow>
  );
}

function TotalReturn({ strategy }: { strategy: SavedStrategyListItem }) {
  const snapshot = strategy.latestSnapshot;
  const profitLoss =
    snapshot?.unrealizedProfitLoss ??
    (snapshot ? snapshot.signedMarkValue - strategy.entrySignedMarkValue : 0);
  const returnOnRisk =
    snapshot?.returnOnRisk ??
    (strategy.capitalAtRisk === null
      ? null
      : profitLoss / strategy.capitalAtRisk);

  return (
    <div
      className={cn(
        "flex flex-col gap-1 font-medium tabular-nums",
        profitLoss > 0 && "text-profit",
        profitLoss < 0 && "text-destructive",
      )}
    >
      <span>{formatCurrency(profitLoss)}</span>
      {returnOnRisk === null ? (
        <span className="text-xs font-normal text-muted-foreground">
          No risk basis
        </span>
      ) : (
        <span className="text-xs font-normal">
          {formatPercent(returnOnRisk)}
        </span>
      )}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: SavedStrategyListItem["displayStatus"];
}) {
  if (status === "open") {
    return <Badge className="bg-profit/15 text-profit">Open</Badge>;
  }

  if (status === "expired") {
    return <Badge variant="destructive">Expired</Badge>;
  }

  return <Badge variant="secondary">Closed</Badge>;
}

function EmptyState() {
  return (
    <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
      <div className="max-w-sm">
        <h2 className="text-lg font-semibold">No saved strategies</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Saved strategies will appear here after you save a valid trade from
          the Builder.
        </p>
      </div>
    </div>
  );
}
