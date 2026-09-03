"use client";

import { CircleHelp } from "lucide-react";
import Link from "next/link";
import { BiasBadge } from "@/components/bias-badge";
import {
  formatExpectedMoveCushion,
  type RiskRewardCandidate,
  type RiskRewardSort,
  type RiskRewardSortColumn,
  sortRiskRewardCandidates,
} from "@/components/risk-reward-candidates-table-model";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/format";
import { STRATEGY_BIAS } from "@/lib/strategy-bias";
import { cn } from "@/lib/utils";

type RiskRewardTableColumn = {
  key: string;
  label?: string;
  help?: React.ReactNode;
  sortColumn?: RiskRewardSortColumn;
  align?: "left" | "right";
  visible?: (input: { showTicker: boolean }) => boolean;
  cellClassName?:
    | string
    | ((candidate: RiskRewardCandidate) => string | undefined);
  Cell: React.ComponentType<CandidateCellProps>;
};

type CandidateCellProps = {
  candidate: RiskRewardCandidate;
};

const RISK_REWARD_TABLE_COLUMNS: RiskRewardTableColumn[] = [
  {
    key: "ticker",
    label: "Ticker",
    sortColumn: "ticker",
    visible: ({ showTicker }) => showTicker,
    cellClassName: "font-mono font-semibold",
    Cell: TickerCell,
  },
  {
    key: "strategy",
    label: "Strategy",
    sortColumn: "strategy",
    cellClassName: "font-medium",
    Cell: StrategyCell,
  },
  {
    key: "expiration",
    label: "Expiration",
    sortColumn: "expiration",
    cellClassName: "font-mono text-xs text-muted-foreground",
    Cell: ExpirationCell,
  },
  {
    key: "strikes",
    label: "Strikes",
    cellClassName: "font-mono text-xs",
    Cell: StrikesCell,
  },
  {
    key: "score",
    label: "Score",
    sortColumn: "score",
    align: "right",
    cellClassName: "text-right font-mono tabular-nums",
    Cell: ScoreCell,
  },
  {
    key: "maxProfit",
    label: "Max Profit",
    sortColumn: "maxProfit",
    align: "right",
    cellClassName: "text-right font-mono tabular-nums",
    Cell: MaxProfitCell,
  },
  {
    key: "maxLoss",
    label: "Max Loss",
    sortColumn: "maxLoss",
    align: "right",
    cellClassName: "text-right font-mono tabular-nums text-destructive",
    Cell: MaxLossCell,
  },
  {
    key: "returnOnRisk",
    label: "Return on Risk",
    sortColumn: "returnOnRisk",
    align: "right",
    cellClassName: returnOnRiskClassName,
    Cell: ReturnOnRiskCell,
  },
  {
    key: "expectedMoveCushion",
    label: "EM Cushion",
    help: <ExpectedMoveCushionHelp />,
    sortColumn: "expectedMoveCushion",
    align: "right",
    cellClassName: expectedMoveCushionClassName,
    Cell: ExpectedMoveCushionCell,
  },
  {
    key: "probabilityOfProfit",
    label: "Probability of Profit",
    sortColumn: "probabilityOfProfit",
    align: "right",
    cellClassName: "text-right font-mono tabular-nums text-primary",
    Cell: ProbabilityOfProfitCell,
  },
  {
    key: "actions",
    align: "right",
    cellClassName: "text-right",
    Cell: ActionsCell,
  },
];

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
  const sortedCandidates = sortRiskRewardCandidates(candidates, sort);
  const columns = visibleColumns(showTicker);
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
            {columns.map((column) => (
              <ColumnHeader
                column={column}
                key={column.key}
                onSort={onSort}
                sort={sort}
              />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleCandidates.map((candidate) => (
            <CandidateRow
              candidate={candidate}
              columns={columns}
              key={candidate.id}
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

function visibleColumns(showTicker: boolean) {
  return RISK_REWARD_TABLE_COLUMNS.filter(
    (column) => column.visible?.({ showTicker }) ?? true,
  );
}

function ColumnHeader({
  column,
  sort,
  onSort,
}: {
  column: RiskRewardTableColumn;
  sort: RiskRewardSort;
  onSort: (column: RiskRewardSortColumn) => void;
}) {
  if (column.sortColumn === undefined) {
    return (
      <TableHead
        className={column.align === "right" ? "text-right" : "text-left"}
      >
        {column.label}
      </TableHead>
    );
  }

  return (
    <SortableHeader
      align={column.align}
      column={column.sortColumn}
      help={column.help}
      onSort={onSort}
      sort={sort}
    >
      {column.label}
    </SortableHeader>
  );
}

function SortableHeader({
  column,
  sort,
  onSort,
  align = "left",
  help,
  children,
}: {
  column: RiskRewardSortColumn;
  sort: RiskRewardSort;
  onSort: (column: RiskRewardSortColumn) => void;
  align?: "left" | "right";
  help?: React.ReactNode;
  children: React.ReactNode;
}) {
  const active = sort.column === column;

  return (
    <TableHead className={align === "right" ? "text-right" : "text-left"}>
      <div
        className={cn(
          "flex items-center gap-1",
          align === "right" ? "justify-end" : "justify-start",
        )}
      >
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
        {help}
      </div>
    </TableHead>
  );
}

function ExpectedMoveCushionHelp() {
  return (
    <HoverCard>
      <HoverCardTrigger
        aria-label="Learn about Expected Move Cushion"
        delay={200}
        render={
          <button
            type="button"
            className="inline-flex size-4 cursor-help items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <CircleHelp aria-hidden="true" className="size-3.5" />
          </button>
        }
      />
      <HoverCardContent
        side="top"
        align="end"
        className="w-72 normal-case tracking-normal"
      >
        <p className="font-medium">Expected Move Cushion</p>
        <p className="mt-1 text-muted-foreground">
          The distance from the current price to the strategy&apos;s profit
          range, measured in expected moves from implied volatility and time to
          expiration. Positive values are inside the profit range; negative
          values are outside it. More positive is better.
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}

function CandidateRow({
  candidate,
  columns,
}: {
  candidate: RiskRewardCandidate;
  columns: RiskRewardTableColumn[];
}) {
  return (
    <TableRow>
      {columns.map((column) => (
        <CandidateCell candidate={candidate} column={column} key={column.key} />
      ))}
    </TableRow>
  );
}

function CandidateCell({
  candidate,
  column,
}: {
  candidate: RiskRewardCandidate;
  column: RiskRewardTableColumn;
}) {
  const Cell = column.Cell;

  return (
    <TableCell className={tableCellClassName(column, candidate)}>
      <Cell candidate={candidate} />
    </TableCell>
  );
}

function tableCellClassName(
  column: RiskRewardTableColumn,
  candidate: RiskRewardCandidate,
) {
  return typeof column.cellClassName === "function"
    ? column.cellClassName(candidate)
    : column.cellClassName;
}

function TickerCell({ candidate }: CandidateCellProps) {
  return <>{candidate.ticker ?? candidate.state.symbol}</>;
}

function StrategyCell({ candidate }: CandidateCellProps) {
  const bias = STRATEGY_BIAS[candidate.state.strategy];

  return (
    <div className="flex flex-col gap-1">
      {titleCase(candidate.summary.strategyLabel)}
      <BiasBadge bias={bias} />
    </div>
  );
}

function ExpirationCell({ candidate }: CandidateCellProps) {
  return <>{candidate.summary.expiration}</>;
}

function StrikesCell({ candidate }: CandidateCellProps) {
  return (
    <>{candidate.summary.strikes.map((strike) => `$${strike}`).join(" / ")}</>
  );
}

function ScoreCell({ candidate }: CandidateCellProps) {
  return <>{formatPercent(candidate.summary.score)}</>;
}

function MaxProfitCell({ candidate }: CandidateCellProps) {
  return <>{formatCurrency(candidate.summary.maxProfit)}</>;
}

function MaxLossCell({ candidate }: CandidateCellProps) {
  return (
    <>
      {candidate.summary.maxLoss === null
        ? "Undefined"
        : formatCurrency(Math.abs(candidate.summary.maxLoss))}
    </>
  );
}

function returnOnRiskClassName(candidate: RiskRewardCandidate) {
  const ror = candidate.summary.returnOnRisk;

  return cn(
    "text-right font-mono font-semibold tabular-nums",
    ror === null
      ? "text-muted-foreground"
      : ror >= 0.25
        ? "text-profit"
        : "text-foreground",
  );
}

function ReturnOnRiskCell({ candidate }: CandidateCellProps) {
  const ror = candidate.summary.returnOnRisk;

  return (
    <>
      <div>{ror === null ? "n/a" : formatPercent(ror)}</div>
      {candidate.summary.returnProfitBasisLabel === "target-profit" && (
        <div className="mt-0.5 text-[10px] font-normal text-muted-foreground">
          target
        </div>
      )}
    </>
  );
}

function ExpectedMoveCushionCell({ candidate }: CandidateCellProps) {
  return (
    <>{formatExpectedMoveCushion(candidate.summary.expectedMoveCushion)}</>
  );
}

function expectedMoveCushionClassName(candidate: RiskRewardCandidate) {
  const value = candidate.summary.expectedMoveCushion;

  return cn(
    "text-right font-mono font-semibold tabular-nums",
    value === null
      ? "text-muted-foreground"
      : value > 0
        ? "text-profit"
        : value < 0
          ? "text-destructive"
          : "text-foreground",
  );
}

function ProbabilityOfProfitCell({ candidate }: CandidateCellProps) {
  return <>{formatPercent(candidate.summary.probabilityOfProfit)}</>;
}

function ActionsCell({ candidate }: CandidateCellProps) {
  return (
    <Button
      nativeButton={false}
      size="sm"
      variant="outline"
      render={<Link href={candidate.summary.builderHref} />}
    >
      Open
    </Button>
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

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
