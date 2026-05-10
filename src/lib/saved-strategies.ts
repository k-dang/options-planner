import { desc, eq } from "drizzle-orm";
import { getDb, savedStrategies, strategySnapshots } from "@/db";
import type {
  SavedStrategyStatus,
  StrategySnapshot,
  StrategySnapshotLegMark,
} from "@/db/schema";
import { evaluateStrategy, type StrategyState } from "@/lib/options";
import {
  buildEntryLegMarks,
  calculateCapitalAtRisk,
  calculateCurrentMarkSnapshot,
  calculateSignedMarkValue,
  generateSavedStrategyName,
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

  return strategies.map((strategy) => {
    const daysUntilExpiration = getDaysUntilExpiration(strategy.entryState);
    const latestSnapshot = latestSnapshots.get(strategy.id) ?? null;
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
  });
}

export async function createSavedStrategyFromEntry(state: StrategyState) {
  const evaluation = evaluateStrategy(state);
  const entrySignedMarkValue = calculateSignedMarkValue(state);
  const capitalAtRisk = calculateCapitalAtRisk(state, evaluation);
  const db = getDb();

  const [saved] = await db
    .insert(savedStrategies)
    .values({
      name: generateSavedStrategyName(state),
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
    throw new Error("Closed and expired strategies cannot be refreshed.");
  }

  const state = strategy.entryState;
  const optionLegs = state.legs.filter((leg) => leg.kind === "option");
  const expirations = optionLegs.map((leg) => leg.expiration).sort();
  const strikes = optionLegs.map((leg) => leg.strike).sort((a, b) => a - b);
  const provider = getOptionChainProvider();
  const chain = await provider.getChain({
    symbol: strategy.symbol,
    expirationGte: expirations[0],
    expirationLte: expirations.at(-1),
    strikeGte: strikes[0],
    strikeLte: strikes.at(-1),
  });
  const mark = calculateCurrentMarkSnapshot({
    state,
    chain,
    entrySignedMarkValue: toNumber(strategy.entrySignedMarkValue),
    capitalAtRisk: toNullableNumber(strategy.capitalAtRisk),
  });

  const [snapshot] = await db
    .insert(strategySnapshots)
    .values({
      strategyId: strategy.id,
      snapshotType: "mark",
      observedAt: mark.observedAt,
      underlyingPrice: decimal(mark.underlyingPrice, 4),
      signedMarkValue: decimal(mark.signedMarkValue),
      unrealizedProfitLoss: decimal(mark.unrealizedProfitLoss),
      returnOnRisk:
        mark.returnOnRisk === null ? null : decimal(mark.returnOnRisk, 6),
      legMarks: mark.legMarks,
      quoteSource: mark.quoteSource,
    })
    .returning({ id: strategySnapshots.id });

  if (!snapshot) {
    throw new Error("Strategy mark insert did not return a row.");
  }

  return snapshot;
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
