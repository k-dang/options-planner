"use client";

import { type ReactNode, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SavedStrategyListItem } from "@/db/saved-strategies";
import {
  formatCurrency,
  formatDateTime,
  formatPercent,
  formatShortDateTime,
  formatTitleCaseFromKebab,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { PositionActions } from "./position-actions";
import { PositionRowActionsCell, PositionRowLink } from "./position-row";
import {
  POSITIONS_TABLE_CLASS,
  PositionsTableColGroup,
} from "./positions-table-layout";

export function PositionsTable({
  strategies,
  autoRefreshControl,
}: {
  strategies: SavedStrategyListItem[];
  autoRefreshControl?: ReactNode;
}) {
  const [showClosed, setShowClosed] = useState(false);
  const closedCount = strategies.filter(
    (strategy) => strategy.status === "closed",
  ).length;
  const visibleStrategies = showClosed
    ? strategies
    : strategies.filter((strategy) => strategy.status !== "closed");

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-border border-b px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Showing {visibleStrategies.length} of {strategies.length} positions
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {autoRefreshControl}
          {closedCount > 0 ? (
            <Button
              type="button"
              variant={showClosed ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowClosed((value) => !value)}
              aria-pressed={showClosed}
            >
              {showClosed ? "Hide closed" : `Show closed (${closedCount})`}
            </Button>
          ) : null}
        </div>
      </div>
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
          {visibleStrategies.map((strategy) => (
            <PositionRow key={strategy.id} strategy={strategy} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PositionRow({ strategy }: { strategy: SavedStrategyListItem }) {
  const snapshot = strategy.latestSnapshot;

  return (
    <PositionRowLink
      href={strategy.builderHref}
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
      <PositionRowActionsCell>
        <PositionActions
          id={strategy.id}
          name={strategy.name}
          disabled={strategy.displayStatus !== "open"}
        />
      </PositionRowActionsCell>
    </PositionRowLink>
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
