"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BiasBadge, STRATEGY_BIAS } from "@/components/bias-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { OptimizerCandidate } from "@/lib/options";
import { cn } from "@/lib/utils";

export type RiskRewardSortColumn =
  | "ticker"
  | "strategy"
  | "expiration"
  | "score"
  | "maxProfit"
  | "maxLoss"
  | "returnOnRisk"
  | "probabilityOfProfit";

export type RiskRewardSortDirection = "asc" | "desc";

export type RiskRewardSort = {
  column: RiskRewardSortColumn;
  dir: RiskRewardSortDirection;
};

export type RiskRewardCandidate = OptimizerCandidate & {
  ticker?: string;
};

const RETURN_ON_RISK_SORT_CAP = 5;

export function RiskRewardCandidatesTable({
  candidates,
  sort,
  onSort,
  showTicker = false,
  page,
  pageSize,
  onPageChange,
  emptyState,
  className,
}: {
  candidates: RiskRewardCandidate[];
  sort: RiskRewardSort;
  onSort: (column: RiskRewardSortColumn) => void;
  showTicker?: boolean;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  emptyState?: React.ReactNode;
  className?: string;
}) {
  const sortedCandidates = useMemo(() => {
    return [...candidates].sort((left, right) => compare(left, right, sort));
  }, [candidates, sort]);
  const shouldPage =
    page !== undefined && pageSize !== undefined && onPageChange !== undefined;
  const totalPages = shouldPage
    ? Math.ceil(sortedCandidates.length / pageSize)
    : 1;
  const visibleCandidates = shouldPage
    ? sortedCandidates.slice(page * pageSize, (page + 1) * pageSize)
    : sortedCandidates;

  if (candidates.length === 0) {
    return emptyState ?? null;
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm",
        className,
      )}
    >
      <Table>
        <TableHeader className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
          <TableRow>
            {showTicker ? (
              <SortableHeader column="ticker" sort={sort} onSort={onSort}>
                Ticker
              </SortableHeader>
            ) : null}
            <SortableHeader column="strategy" sort={sort} onSort={onSort}>
              Strategy
            </SortableHeader>
            <SortableHeader column="expiration" sort={sort} onSort={onSort}>
              Expiration
            </SortableHeader>
            <TableHead>Strikes</TableHead>
            <SortableHeader
              column="score"
              sort={sort}
              onSort={onSort}
              align="right"
            >
              Score
            </SortableHeader>
            <SortableHeader
              column="maxProfit"
              sort={sort}
              onSort={onSort}
              align="right"
            >
              Max Profit
            </SortableHeader>
            <SortableHeader
              column="maxLoss"
              sort={sort}
              onSort={onSort}
              align="right"
            >
              Max Loss
            </SortableHeader>
            <SortableHeader
              column="returnOnRisk"
              sort={sort}
              onSort={onSort}
              align="right"
            >
              Return on Risk
            </SortableHeader>
            <SortableHeader
              column="probabilityOfProfit"
              sort={sort}
              onSort={onSort}
              align="right"
            >
              Probability of Profit
            </SortableHeader>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleCandidates.map((candidate) => (
            <CandidateRow
              candidate={candidate}
              key={candidate.id}
              showTicker={showTicker}
            />
          ))}
        </TableBody>
      </Table>
      {shouldPage ? (
        <PaginationFooter
          page={page}
          pageSize={pageSize}
          totalItems={sortedCandidates.length}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      ) : null}
    </section>
  );
}

export function defaultRiskRewardSortDirection(
  column: RiskRewardSortColumn,
): RiskRewardSortDirection {
  return column === "ticker" || column === "strategy" || column === "expiration"
    ? "asc"
    : "desc";
}

function SortableHeader({
  column,
  sort,
  onSort,
  align = "left",
  children,
}: {
  column: RiskRewardSortColumn;
  sort: RiskRewardSort;
  onSort: (column: RiskRewardSortColumn) => void;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const active = sort.column === column;

  return (
    <TableHead className={align === "right" ? "text-right" : "text-left"}>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => onSort(column)}
        className={cn(
          "h-auto gap-1 px-0 font-medium uppercase tracking-wider hover:bg-transparent hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {children}
        <span className="text-[9px] opacity-70">
          {active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </Button>
    </TableHead>
  );
}

function CandidateRow({
  candidate,
  showTicker,
}: {
  candidate: RiskRewardCandidate;
  showTicker: boolean;
}) {
  const bias = STRATEGY_BIAS[candidate.state.strategy];
  const ror = candidate.summary.returnOnRisk;
  const isGoodRor = ror !== null && ror >= 0.25;

  return (
    <TableRow>
      {showTicker ? (
        <TableCell className="font-mono font-semibold">
          {candidate.ticker ?? candidate.state.symbol}
        </TableCell>
      ) : null}
      <TableCell className="font-medium">
        <div className="flex flex-col gap-1">
          {titleCase(candidate.summary.strategyLabel)}
          <BiasBadge bias={bias} />
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {candidate.summary.expiration}
      </TableCell>
      <TableCell className="font-mono text-xs">
        {candidate.summary.strikes.map((strike) => `$${strike}`).join(" / ")}
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums">
        {formatPercent(candidate.summary.score)}
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums">
        {formatCurrency(candidate.summary.maxProfit)}
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums text-destructive">
        {candidate.summary.maxLoss === null
          ? "Undefined"
          : formatCurrency(Math.abs(candidate.summary.maxLoss))}
      </TableCell>
      <TableCell
        className={cn(
          "text-right font-mono font-semibold tabular-nums",
          ror === null
            ? "text-muted-foreground"
            : isGoodRor
              ? "text-profit"
              : "text-foreground",
        )}
      >
        <div>{ror === null ? "n/a" : formatPercent(ror)}</div>
        {candidate.summary.returnProfitBasisLabel === "target-profit" && (
          <div className="mt-0.5 text-[10px] font-normal text-muted-foreground">
            target
          </div>
        )}
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums text-primary">
        {formatPercent(candidate.summary.probabilityOfProfit)}
      </TableCell>
      <TableCell className="text-right">
        <Button
          nativeButton={false}
          size="sm"
          variant="outline"
          render={<Link href={candidate.summary.builderHref} />}
        >
          Open
        </Button>
      </TableCell>
    </TableRow>
  );
}

function PaginationFooter({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-border/50 px-4 py-2">
      <span className="text-xs text-muted-foreground">
        {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalItems)} of{" "}
        {totalItems} setups
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="xs"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          {page + 1} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="xs"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function compare(
  left: RiskRewardCandidate,
  right: RiskRewardCandidate,
  sort: RiskRewardSort,
) {
  const sign = sort.dir === "asc" ? 1 : -1;

  switch (sort.column) {
    case "ticker":
      return (
        sign *
        (left.ticker ?? left.state.symbol).localeCompare(
          right.ticker ?? right.state.symbol,
        )
      );
    case "strategy":
      return (
        sign *
        left.summary.strategyLabel.localeCompare(right.summary.strategyLabel)
      );
    case "expiration":
      return (
        sign * left.summary.expiration.localeCompare(right.summary.expiration)
      );
    case "score":
      return sign * compareNullable(left.summary.score, right.summary.score);
    case "maxProfit":
      return (
        sign * compareNullable(left.summary.maxProfit, right.summary.maxProfit)
      );
    case "maxLoss":
      return (
        sign * compareNullable(left.summary.maxLoss, right.summary.maxLoss)
      );
    case "returnOnRisk":
      return (
        sign *
        compareNullable(
          cappedReturnOnRisk(left.summary.returnOnRisk),
          cappedReturnOnRisk(right.summary.returnOnRisk),
        )
      );
    case "probabilityOfProfit":
      return (
        sign *
        compareNullable(
          left.summary.probabilityOfProfit,
          right.summary.probabilityOfProfit,
        )
      );
    default:
      return 0;
  }
}

function compareNullable(left: number | null, right: number | null) {
  if (left === null && right === null) return 0;
  if (left === null) return -1;
  if (right === null) return 1;

  return left - right;
}

function cappedReturnOnRisk(value: number | null) {
  return value === null ? null : Math.min(value, RETURN_ON_RISK_SORT_CAP);
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
