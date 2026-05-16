"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  defaultRiskRewardSortDirection,
  RiskRewardCandidatesTable,
  type RiskRewardSort,
  type RiskRewardSortColumn,
} from "@/components/risk-reward-candidates-table";
import {
  createDefaultScanFilters,
  ScanCriteriaControls,
  type ScanFilters,
} from "@/components/scan-criteria-controls";
import { TickerCombobox } from "@/components/ticker-combobox";
import { formatCurrency } from "@/lib/format";
import { scanSymbolHref } from "@/lib/hrefs";
import { type OptionChainSnapshot, scanRiskReward } from "@/lib/options";

export function ScanClient({
  initialChain,
}: {
  initialChain: OptionChainSnapshot;
}) {
  const router = useRouter();
  const [filters, setFilters] = useState<ScanFilters>(createDefaultScanFilters);
  const [sort, setSort] = useState<RiskRewardSort>({
    column: "score",
    dir: "desc",
  });
  const [page, setPage] = useState(0);
  const chain = initialChain;

  const candidates = useMemo(() => {
    return scanRiskReward(
      {
        symbol: chain.underlying.symbol,
        minDaysToExpiration: filters.minDays,
        maxDaysToExpiration: filters.maxDays,
        minProbabilityOfProfit: filters.minPop,
        enabledStrategies: [...filters.enabled],
      },
      chain,
    );
  }, [chain, filters]);

  const PAGE_SIZE = 50;

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

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-white/60 p-6 shadow-xl backdrop-blur-xl dark:bg-white/4">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/12 blur-3xl" />

        <div className="relative flex flex-wrap items-center gap-3">
          <TickerCombobox
            defaultSymbol={chain.underlying.symbol}
            onNavigate={(symbol) => router.push(scanSymbolHref(symbol))}
          />
          <div className="font-mono text-sm text-muted-foreground">
            {formatCurrency(chain.underlying.price)}
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {candidates.length} setups
          </div>
        </div>

        <div className="relative mt-5 flex flex-col gap-5">
          <ScanCriteriaControls
            filters={filters}
            onFiltersChange={updateFilters}
          />
        </div>
      </section>

      <RiskRewardCandidatesTable
        candidates={candidates}
        sort={sort}
        onSort={setSortColumn}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
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
      />
    </>
  );
}
