"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type { SavedStrategyListItem } from "@/db/saved-strategies";
import {
  formatCurrency,
  formatDateTime,
  formatPercent,
  formatShortDateTime,
  formatTitleCaseFromKebab,
} from "@/lib/format";
import { hasMarketMark, type MarkFreshness } from "@/lib/options/monitoring";
import { cn } from "@/lib/utils";
import { PositionActions } from "./position-actions";
import {
  POSITIONS_TABLE_CLASS,
  PositionsTableColGroup,
  PositionsTableHead,
} from "./positions-table-layout";

// Filters on DB status, not displayStatus. Expired-but-unsettled positions
// (status still "open") stay visible until settlement realizes their P&L.
const isRealized = (strategy: SavedStrategyListItem) =>
  strategy.status === "closed" || strategy.status === "expired";

export function PositionsTable({
  strategies,
  markFreshness,
}: {
  strategies: SavedStrategyListItem[];
  markFreshness: MarkFreshness | null;
}) {
  const [showRealized, setShowRealized] = useState(false);
  const realizedCount = strategies.filter(isRealized).length;
  const visibleStrategies = showRealized
    ? strategies
    : strategies.filter((strategy) => !isRealized(strategy));

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-border border-b px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Showing {visibleStrategies.length} of {strategies.length} positions
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {markFreshness ? <MarkFreshnessNote {...markFreshness} /> : null}
          {realizedCount > 0 ? (
            <Button
              type="button"
              variant={showRealized ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowRealized((value) => !value)}
              aria-pressed={showRealized}
            >
              {showRealized
                ? "Hide realized"
                : `Show realized (${realizedCount})`}
            </Button>
          ) : null}
        </div>
      </div>
      <Table className={POSITIONS_TABLE_CLASS}>
        <PositionsTableColGroup />
        <PositionsTableHead />
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
    <TableRow
      className={cn(
        "relative hover:bg-accent/50",
        "has-[a:focus-visible]:bg-accent/50 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-ring",
        (strategy.displayStatus === "closed" ||
          strategy.displayStatus === "expired") &&
          "bg-muted/20 text-muted-foreground",
      )}
    >
      <TableCell>
        <div className="flex min-w-0 flex-col gap-1">
          {/* Stretched link: the ::after overlay makes the whole row clickable
              while keeping a real, prefetchable, middle-clickable anchor. */}
          <Link
            href={strategy.builderHref}
            className="truncate font-medium text-foreground outline-none after:absolute after:inset-0"
          >
            {strategy.name}
          </Link>
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
        {snapshot && hasMarketMark(snapshot) ? (
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatShortDateTime(snapshot.observedAt)}
          </span>
        ) : (
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground/60">
            Never
          </span>
        )}
      </TableCell>
      {/* relative so the actions stack above the stretched link overlay */}
      <TableCell className="relative">
        <PositionActions
          id={strategy.id}
          name={strategy.name}
          disabled={strategy.displayStatus !== "open"}
        />
      </TableCell>
    </TableRow>
  );
}

function MarkFreshnessNote({ lastMarkedAt, stale }: MarkFreshness) {
  return (
    <p
      className={cn(
        "text-xs tabular-nums text-muted-foreground",
        stale && "text-destructive",
      )}
    >
      {lastMarkedAt
        ? `Last marked ${formatShortDateTime(lastMarkedAt)}`
        : "Not marked yet"}
      {stale ? " · refresh overdue" : null}
    </p>
  );
}

function TotalReturn({ strategy }: { strategy: SavedStrategyListItem }) {
  const snapshot = strategy.latestSnapshot;

  if (!snapshot || !hasMarketMark(snapshot)) {
    return (
      <span className="text-sm text-muted-foreground">Not marked yet</span>
    );
  }

  const profitLoss = snapshot.unrealizedProfitLoss;
  const returnOnRisk = snapshot.returnOnRisk;

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
    return <Badge variant="outline">Expired</Badge>;
  }

  return <Badge variant="secondary">Closed</Badge>;
}
