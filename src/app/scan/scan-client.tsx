"use client";

import { useRouter } from "next/navigation";
import { Suspense, use, useState } from "react";
import { RiskRewardCandidatesTable } from "@/components/risk-reward-candidates-table";
import {
  defaultRiskRewardSortDirection,
  type RiskRewardSort,
  type RiskRewardSortColumn,
} from "@/components/risk-reward-candidates-table-model";
import {
  createDefaultScanFilters,
  ScanCriteriaControls,
  type ScanFilters,
} from "@/components/scan-criteria-controls";
import { TickerCombobox } from "@/components/ticker-combobox";
import { formatCurrency } from "@/lib/format";
import { scanSymbolHref } from "@/lib/hrefs";
import { type OptionChainSnapshot, scanRiskReward } from "@/lib/options";
import { ScanSkeleton, ScanSummarySkeleton } from "./scan-skeleton";

export function ScanClient({
  initialChain,
}: {
  initialChain: Promise<OptionChainSnapshot>;
}) {
  const [filters, setFilters] = useState<ScanFilters>(createDefaultScanFilters);
  const [sort, setSort] = useState<RiskRewardSort>({
    column: "score",
    dir: "desc",
  });
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  function setSortColumn(column: RiskRewardSortColumn) {
    setPage(0);
    setSort((current) =>
      current.column === column
        ? { column, dir: current.dir === "asc" ? "desc" : "asc" }
        : { column, dir: defaultRiskRewardSortDirection(column) },
    );
  }

  function updateFilters(nextFilters: ScanFilters) {
    setPage(0);
    setFilters(nextFilters);
  }

  function resetForSymbol() {
    setFilters(createDefaultScanFilters());
    setSort({ column: "score", dir: "desc" });
    setPage(0);
  }

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-white/60 p-6 shadow-xl backdrop-blur-xl dark:bg-white/4">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/12 blur-3xl" />

        <div className="relative flex flex-wrap items-center gap-3">
          <Suspense fallback={<ScanSummarySkeleton />}>
            <ScanSummary
              initialChain={initialChain}
              onSymbolChange={resetForSymbol}
            />
          </Suspense>
        </div>

        <div className="relative mt-5 flex flex-col gap-5">
          <ScanCriteriaControls
            filters={filters}
            onFiltersChange={updateFilters}
          />
        </div>
      </section>

      <Suspense fallback={<ScanSkeleton />}>
        <ScanResults
          filters={filters}
          initialChain={initialChain}
          page={page}
          pageSize={PAGE_SIZE}
          sort={sort}
          onPageChange={setPage}
          onSort={setSortColumn}
        />
      </Suspense>
    </>
  );
}

function ScanSummary({
  initialChain,
  onSymbolChange,
}: {
  initialChain: Promise<OptionChainSnapshot>;
  onSymbolChange: () => void;
}) {
  const router = useRouter();
  const chain = use(initialChain);

  return (
    <>
      <TickerCombobox
        defaultSymbol={chain.underlying.symbol}
        key={chain.underlying.symbol}
        onNavigate={(symbol) => {
          onSymbolChange();
          router.push(scanSymbolHref(symbol));
        }}
      />
      <div className="font-mono text-sm text-muted-foreground">
        {formatCurrency(chain.underlying.price)}
      </div>
    </>
  );
}

function ScanResults({
  filters,
  initialChain,
  page,
  pageSize,
  sort,
  onPageChange,
  onSort,
}: {
  filters: ScanFilters;
  initialChain: Promise<OptionChainSnapshot>;
  page: number;
  pageSize: number;
  sort: RiskRewardSort;
  onPageChange: (page: number) => void;
  onSort: (column: RiskRewardSortColumn) => void;
}) {
  const chain = use(initialChain);
  const candidates = scanRiskReward(
    {
      symbol: chain.underlying.symbol,
      minDaysToExpiration: filters.minDays,
      maxDaysToExpiration: filters.maxDays,
      minProbabilityOfProfit: filters.minPop,
      enabledStrategies: [...filters.enabled],
    },
    chain,
  );

  return (
    <div className="flex flex-col gap-2" data-testid="scanner-resolved">
      <p className="text-right text-xs text-muted-foreground">
        {candidates.length} setups
      </p>
      <RiskRewardCandidatesTable
        candidates={candidates}
        emptyState={
          <section className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-lg font-semibold">No setups match</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try widening the DTE range, lowering PoP floor, or enabling more
                strategies.
              </p>
            </div>
          </section>
        }
        page={page}
        pageSize={pageSize}
        sort={sort}
        onPageChange={onPageChange}
        onSort={onSort}
      />
    </div>
  );
}
