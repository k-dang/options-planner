import type { Metadata } from "next";
import { Suspense } from "react";
import { getPositionRefreshWorkflowState } from "@/db/position-refresh-workflow-state";
import {
  listSavedStrategies,
  type SavedStrategyListItem,
} from "@/db/saved-strategies";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DevSkeletonToggle } from "./dev-skeleton-toggle";
import {
  AutoRefreshPositionsButton,
  RefreshAllPositionsButton,
} from "./position-actions";
import { PositionsSkeleton } from "./positions-skeleton";
import { PositionsTable } from "./positions-table";

const IS_DEV = process.env.NODE_ENV === "development";

export const metadata: Metadata = {
  title: "Positions",
};

export default function PositionsPage() {
  const body = (
    <Suspense fallback={<PositionsSkeleton />}>
      <PositionsContent />
    </Suspense>
  );

  return (
    <main>
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
              Saved Strategies
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Positions
            </h1>
          </div>
          <div className="flex flex-wrap items-start justify-end gap-3">
            <RefreshAllPositionsButton />
          </div>
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

async function AutoRefreshControl({ compact }: { compact?: boolean }) {
  const autoRefresh = await getPositionRefreshWorkflowState();

  return (
    <AutoRefreshPositionsButton
      enabled={autoRefresh.enabled}
      intervalSeconds={autoRefresh.intervalSeconds}
      lastError={autoRefresh.lastError}
      compact={compact}
    />
  );
}

async function PositionsContent() {
  const strategies = await listSavedStrategies();
  const realizedProfitLoss = calculateRealizedProfitLoss(strategies);
  const realizedCount = strategies.filter(isRealized).length;

  const autoRefreshControl = (
    <Suspense
      key="auto-refresh-control"
      fallback={<AutoRefreshPositionsButton disabled compact />}
    >
      <AutoRefreshControl compact />
    </Suspense>
  );

  return (
    <>
      {strategies.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-4">
          <RealizedProfitLossSummary
            realizedCount={realizedCount}
            realizedProfitLoss={realizedProfitLoss}
          />
          <PositionsTable
            strategies={strategies}
            autoRefreshControl={autoRefreshControl}
          />
        </div>
      )}
    </>
  );
}

function isRealized(strategy: SavedStrategyListItem) {
  return strategy.status === "closed" || strategy.status === "expired";
}

function calculateRealizedProfitLoss(strategies: SavedStrategyListItem[]) {
  return strategies.reduce((total, strategy) => {
    if (!isRealized(strategy)) {
      return total;
    }
    const snapshot = strategy.latestSnapshot;
    const profitLoss =
      snapshot?.unrealizedProfitLoss ??
      (snapshot ? snapshot.signedMarkValue - strategy.entrySignedMarkValue : 0);

    return total + profitLoss;
  }, 0);
}

function RealizedProfitLossSummary({
  realizedCount,
  realizedProfitLoss,
}: {
  realizedCount: number;
  realizedProfitLoss: number;
}) {
  return (
    <section
      aria-label="Realized P&L summary"
      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3"
    >
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Realized P&L
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {realizedCount === 1
            ? "1 realized position"
            : `${realizedCount} realized positions`}
        </p>
      </div>
      <p
        className={cn(
          "text-2xl font-semibold tabular-nums",
          realizedProfitLoss > 0 && "text-profit",
          realizedProfitLoss < 0 && "text-destructive",
        )}
      >
        {formatCurrency(realizedProfitLoss)}
      </p>
    </section>
  );
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
