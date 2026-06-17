import { and, desc, eq } from "drizzle-orm";
import { getDb, savedStrategies, strategySnapshots } from "@/db";
import type {
  NewStrategySnapshot,
  SavedStrategy,
  SavedStrategyStatus,
  StrategySnapshot,
  StrategySnapshotLegMark,
  StrategySnapshotType,
} from "@/db/schema";
import { strategyBuilderHref } from "@/lib/hrefs";
import {
  evaluateStrategy,
  type StrategyState,
  strategyTemplates,
} from "@/lib/options";
import {
  buildEntryLegMarks,
  type CurrentMarkSnapshotResult,
  calculateCapitalAtRisk,
  calculateCurrentMarkSnapshot,
  calculateSettlementSnapshot,
  calculateSignedMarkValue,
  getDaysUntilExpiration,
} from "@/lib/options/monitoring";
import { getOptionChainProvider } from "@/lib/options/providers/registry";

export type SavedStrategyListItem = {
  id: string;
  name: string;
  symbol: string;
  strategyType: string;
  status: SavedStrategyStatus;
  displayStatus: SavedStrategyStatus;
  createdAt: Date;
  closedAt: Date | null;
  daysUntilExpiration: number | null;
  entrySignedMarkValue: number;
  capitalAtRisk: number | null;
  builderHref: string;
  latestSnapshot: {
    id: string;
    snapshotType: StrategySnapshot["snapshotType"];
    observedAt: Date;
    underlyingPrice: number;
    signedMarkValue: number;
    unrealizedProfitLoss: number;
    returnOnRisk: number | null;
    legMarks: StrategySnapshotLegMark[];
    quoteSource: string;
  } | null;
};

function buildPositionBuilderHref(strategy: SavedStrategy): string {
  const base = strategyBuilderHref(strategy.entryState);
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}positionId=${encodeURIComponent(strategy.id)}`;
}

function toSavedStrategyListItem(
  strategy: SavedStrategy,
  latestSnapshot: StrategySnapshot | null,
): SavedStrategyListItem {
  const daysUntilExpiration = getDaysUntilExpiration(strategy.entryState);
  const displayStatus =
    strategy.status === "open" &&
    daysUntilExpiration !== null &&
    daysUntilExpiration < 0
      ? "expired"
      : strategy.status;

  return {
    id: strategy.id,
    name: strategy.name,
    symbol: strategy.symbol,
    strategyType: strategy.strategyType,
    status: strategy.status,
    displayStatus,
    createdAt: strategy.createdAt,
    closedAt: strategy.closedAt,
    daysUntilExpiration,
    entrySignedMarkValue: toNumber(strategy.entrySignedMarkValue),
    capitalAtRisk: toNullableNumber(strategy.capitalAtRisk),
    builderHref: buildPositionBuilderHref(strategy),
    latestSnapshot: latestSnapshot
      ? {
          id: latestSnapshot.id,
          snapshotType: latestSnapshot.snapshotType,
          observedAt: latestSnapshot.observedAt,
          underlyingPrice: toNumber(latestSnapshot.underlyingPrice),
          signedMarkValue: toNumber(latestSnapshot.signedMarkValue),
          unrealizedProfitLoss: toNumber(latestSnapshot.unrealizedProfitLoss),
          returnOnRisk: toNullableNumber(latestSnapshot.returnOnRisk),
          legMarks: latestSnapshot.legMarks,
          quoteSource: latestSnapshot.quoteSource,
        }
      : null,
  };
}

export async function listSavedStrategies(): Promise<SavedStrategyListItem[]> {
  const db = getDb();
  const [strategies, snapshots] = await Promise.all([
    db
      .select()
      .from(savedStrategies)
      .orderBy(savedStrategies.symbol, desc(savedStrategies.createdAt)),
    db
      .select()
      .from(strategySnapshots)
      .orderBy(
        desc(strategySnapshots.observedAt),
        desc(strategySnapshots.createdAt),
      ),
  ]);
  const latestSnapshots = new Map<string, StrategySnapshot>();

  for (const snapshot of snapshots) {
    if (!latestSnapshots.has(snapshot.strategyId)) {
      latestSnapshots.set(snapshot.strategyId, snapshot);
    }
  }

  return strategies.map((strategy) =>
    toSavedStrategyListItem(strategy, latestSnapshots.get(strategy.id) ?? null),
  );
}

export async function getSavedStrategy(
  id: string,
): Promise<SavedStrategyListItem | null> {
  const db = getDb();
  const [strategy] = await db
    .select()
    .from(savedStrategies)
    .where(eq(savedStrategies.id, id))
    .limit(1);

  if (!strategy) {
    return null;
  }

  const [latestSnapshot] = await db
    .select()
    .from(strategySnapshots)
    .where(eq(strategySnapshots.strategyId, id))
    .orderBy(
      desc(strategySnapshots.observedAt),
      desc(strategySnapshots.createdAt),
    )
    .limit(1);

  return toSavedStrategyListItem(strategy, latestSnapshot ?? null);
}

export async function createSavedStrategyFromEntry(state: StrategyState) {
  const evaluation = evaluateStrategy(state);
  const entrySignedMarkValue = calculateSignedMarkValue(state);
  const capitalAtRisk = calculateCapitalAtRisk(state, evaluation);
  const db = getDb();

  const [saved] = await db
    .insert(savedStrategies)
    .values({
      name: strategyTemplates.summarize(state).savedName,
      symbol: state.symbol.toUpperCase(),
      strategyType: state.strategy,
      status: "open",
      entryState: state,
      entryEvaluation: evaluation,
      entrySignedMarkValue: decimal(entrySignedMarkValue),
      capitalAtRisk: capitalAtRisk === null ? null : decimal(capitalAtRisk),
    })
    .returning({ id: savedStrategies.id, name: savedStrategies.name });

  if (!saved) {
    throw new Error("Saved strategy insert did not return a row.");
  }

  try {
    await db.insert(strategySnapshots).values({
      strategyId: saved.id,
      snapshotType: "entry",
      observedAt: new Date(state.asOf),
      underlyingPrice: decimal(state.underlyingPrice, 4),
      signedMarkValue: decimal(entrySignedMarkValue),
      unrealizedProfitLoss: decimal(0),
      returnOnRisk: capitalAtRisk === null ? null : decimal(0, 6),
      legMarks: buildEntryLegMarks(state),
      quoteSource: "entry",
    });
  } catch (error) {
    await db.delete(savedStrategies).where(eq(savedStrategies.id, saved.id));
    throw error;
  }

  return saved;
}

export async function refreshSavedStrategyMark(id: string) {
  const strategy = await loadOpenStrategy(
    id,
    "Closed and expired strategies cannot be refreshed.",
  );
  return refreshStrategySnapshot(strategy);
}

export async function closeSavedStrategyAtMarketMark(id: string) {
  const strategy = await loadOpenStrategy(
    id,
    "Only open strategies can be closed.",
  );
  const mark = await fetchMarkForStrategy(strategy);
  return recordTerminalSnapshot(strategy, mark, "closed");
}

export async function deleteSavedStrategy(id: string) {
  const db = getDb();
  const [deleted] = await db
    .delete(savedStrategies)
    .where(eq(savedStrategies.id, id))
    .returning({ id: savedStrategies.id });

  if (!deleted) {
    throw new Error("Saved strategy was not found.");
  }

  return deleted;
}

export async function refreshOpenSavedStrategies() {
  const db = getDb();
  const strategies = await db
    .select()
    .from(savedStrategies)
    .where(eq(savedStrategies.status, "open"));

  const settled = await Promise.allSettled(
    strategies.map((strategy) => refreshStrategySnapshot(strategy)),
  );

  return settled.map((result, index) => {
    const id = strategies[index].id;
    if (result.status === "fulfilled") {
      return { id, ok: true as const, message: null };
    }
    return {
      id,
      ok: false as const,
      message:
        result.reason instanceof Error
          ? result.reason.message
          : "Could not refresh this strategy.",
    };
  });
}

async function loadOpenStrategy(
  id: string,
  notOpenMessage: string,
): Promise<SavedStrategy> {
  const db = getDb();
  const [strategy] = await db
    .select()
    .from(savedStrategies)
    .where(eq(savedStrategies.id, id))
    .limit(1);

  if (!strategy) {
    throw new Error("Saved strategy was not found.");
  }
  if (strategy.status !== "open") {
    throw new Error(notOpenMessage);
  }
  return strategy;
}

async function refreshStrategySnapshot(strategy: SavedStrategy) {
  const daysUntilExpiration = getDaysUntilExpiration(strategy.entryState);
  if (daysUntilExpiration !== null && daysUntilExpiration < 0) {
    return settleExpiredStrategy(strategy);
  }

  const mark = await fetchMarkForStrategy(strategy);
  const db = getDb();
  const [snapshot] = await db
    .insert(strategySnapshots)
    .values(buildSnapshotValues(strategy, mark, "mark"))
    .returning({ id: strategySnapshots.id });

  if (!snapshot) {
    throw new Error("Strategy mark insert did not return a row.");
  }
  return snapshot;
}

// A strategy past expiration settles once at intrinsic value and never marks
// again. Settlement is computed from the latest underlying price and frozen; if
// that price is unavailable we throw so the next refresh retries instead of
// recording a bogus settlement. See docs/adr/0001-expiry-settlement-uses-latest-price.md.
async function settleExpiredStrategy(strategy: SavedStrategy) {
  const chain = await fetchChainForStrategy(strategy);
  const underlyingPrice = chain.underlying.price;

  if (!Number.isFinite(underlyingPrice) || underlyingPrice <= 0) {
    throw new Error("Underlying price unavailable for expiry settlement.");
  }

  const settlement = calculateSettlementSnapshot({
    state: strategy.entryState,
    underlyingPrice,
    entrySignedMarkValue: toNumber(strategy.entrySignedMarkValue),
    capitalAtRisk: toNullableNumber(strategy.capitalAtRisk),
  });

  return recordTerminalSnapshot(strategy, settlement, "expired");
}

// Atomically records a terminal snapshot and flips an open strategy to its
// terminal status in one batch. The `open` status guard makes the update a
// no-op (surfaced as a thrown error) if the strategy already left the open
// state, so a snapshot is never written without the matching transition.
async function recordTerminalSnapshot(
  strategy: SavedStrategy,
  snapshot: CurrentMarkSnapshotResult,
  status: "closed" | "expired",
) {
  const db = getDb();
  const [insertResult, updateResult] = await db.batch([
    db
      .insert(strategySnapshots)
      .values(buildSnapshotValues(strategy, snapshot, "close"))
      .returning({ id: strategySnapshots.id }),
    db
      .update(savedStrategies)
      .set({
        status,
        closedAt: status === "closed" ? snapshot.observedAt : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(savedStrategies.id, strategy.id),
          eq(savedStrategies.status, "open"),
        ),
      )
      .returning({ id: savedStrategies.id }),
  ]);

  if (!insertResult[0]) {
    throw new Error("Strategy terminal snapshot insert did not return a row.");
  }
  if (!updateResult[0]) {
    throw new Error(`Saved strategy could not be marked ${status}.`);
  }
  return insertResult[0];
}

async function fetchMarkForStrategy(strategy: SavedStrategy) {
  const chain = await fetchChainForStrategy(strategy);

  return calculateCurrentMarkSnapshot({
    state: strategy.entryState,
    chain,
    entrySignedMarkValue: toNumber(strategy.entrySignedMarkValue),
    capitalAtRisk: toNullableNumber(strategy.capitalAtRisk),
  });
}

async function fetchChainForStrategy(strategy: SavedStrategy) {
  const state = strategy.entryState;
  const optionLegs = state.legs.filter((leg) => leg.kind === "option");
  const expirations = optionLegs.map((leg) => leg.expiration).sort();
  const strikes = optionLegs.map((leg) => leg.strike).sort((a, b) => a - b);
  const provider = getOptionChainProvider();

  return provider.getChain({
    symbol: strategy.symbol,
    expirationGte: expirations[0],
    expirationLte: expirations.at(-1),
    strikeGte: strikes[0],
    strikeLte: strikes.at(-1),
  });
}

function buildSnapshotValues(
  strategy: SavedStrategy,
  mark: CurrentMarkSnapshotResult,
  snapshotType: StrategySnapshotType,
): NewStrategySnapshot {
  return {
    strategyId: strategy.id,
    snapshotType,
    observedAt: mark.observedAt,
    underlyingPrice: decimal(mark.underlyingPrice, 4),
    signedMarkValue: decimal(mark.signedMarkValue),
    unrealizedProfitLoss: decimal(mark.unrealizedProfitLoss),
    returnOnRisk:
      mark.returnOnRisk === null ? null : decimal(mark.returnOnRisk, 6),
    legMarks: mark.legMarks,
    quoteSource: mark.quoteSource,
  };
}

function decimal(value: number, places = 2) {
  return value.toFixed(places);
}

function toNumber(value: string) {
  return Number(value);
}

function toNullableNumber(value: string | null) {
  return value === null ? null : Number(value);
}
