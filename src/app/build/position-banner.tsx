import { Badge } from "@/components/ui/badge";
import {
  getSavedStrategy,
  type SavedStrategyListItem,
} from "@/db/saved-strategies";
import {
  formatCurrency,
  formatPercent,
  formatShortDateTime,
  formatTitleCaseFromKebab,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export async function PositionBanner({ positionId }: { positionId: string }) {
  const position = await getSavedStrategy(positionId);

  if (!position) {
    return null;
  }

  const snapshot = position.latestSnapshot;
  const profitLoss =
    snapshot?.unrealizedProfitLoss ??
    (snapshot ? snapshot.signedMarkValue - position.entrySignedMarkValue : 0);
  const returnOnRisk =
    snapshot?.returnOnRisk ??
    (position.capitalAtRisk === null
      ? null
      : profitLoss / position.capitalAtRisk);

  return (
    <section
      aria-label="Saved position context"
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 shadow-sm",
        (position.displayStatus === "closed" ||
          position.displayStatus === "expired") &&
          "border-border bg-muted/30",
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
          Viewing saved position
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="truncate text-lg font-semibold tracking-tight">
            {position.name}
          </h2>
          <StatusBadge status={position.displayStatus} />
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          {position.symbol} · {formatTitleCaseFromKebab(position.strategyType)}
          {snapshot
            ? ` · marked ${formatShortDateTime(snapshot.observedAt)}`
            : ""}
        </p>
      </div>

      <dl className="flex items-center gap-6">
        <div className="flex flex-col items-end gap-0.5">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {position.status === "open" ? "Unrealized" : "Realized"} P/L
          </dt>
          <dd
            className={cn(
              "font-mono text-lg font-semibold tabular-nums leading-none",
              profitLoss > 0 && "text-profit",
              profitLoss < 0 && "text-destructive",
            )}
          >
            {formatCurrency(profitLoss)}
          </dd>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Return
          </dt>
          <dd
            className={cn(
              "font-mono text-lg font-semibold tabular-nums leading-none",
              returnOnRisk !== null && returnOnRisk > 0 && "text-profit",
              returnOnRisk !== null && returnOnRisk < 0 && "text-destructive",
            )}
          >
            {returnOnRisk === null ? "n/a" : formatPercent(returnOnRisk)}
          </dd>
        </div>
      </dl>
    </section>
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
