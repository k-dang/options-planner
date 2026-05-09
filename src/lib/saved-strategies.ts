import { eq } from "drizzle-orm";
import { getDb, savedStrategies, strategySnapshots } from "@/db";
import { evaluateStrategy, type StrategyState } from "@/lib/options";
import {
  buildEntryLegMarks,
  calculateCapitalAtRisk,
  calculateSignedMarkValue,
  generateSavedStrategyName,
} from "@/lib/options/monitoring";

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

function decimal(value: number, places = 2) {
  return value.toFixed(places);
}
