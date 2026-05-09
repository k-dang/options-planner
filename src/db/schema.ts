import {
  index,
  jsonb,
  numeric,
  pgSchema,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { StrategyEvaluation, StrategyState } from "@/lib/options/types";

export const optionsPlannerSchema = pgSchema("options_planner");

export const savedStrategyStatus = optionsPlannerSchema.enum(
  "saved_strategy_status",
  ["open", "closed", "expired"],
);

export const strategySnapshotType = optionsPlannerSchema.enum(
  "strategy_snapshot_type",
  ["entry", "mark", "close"],
);

export type SavedStrategyStatus =
  (typeof savedStrategyStatus.enumValues)[number];
export type StrategySnapshotType =
  (typeof strategySnapshotType.enumValues)[number];

export type StrategySnapshotLegMark = {
  legIndex: number;
  kind: "stock" | "option";
  side: "long" | "short";
  quantity: number;
  markPrice: number;
  signedMarkValue: number;
  source: "entry" | "mid" | "last" | "model" | "underlying";
  providerSymbol?: string;
  updatedAt?: string | null;
};

export const savedStrategies = optionsPlannerSchema.table(
  "saved_strategies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    symbol: varchar("symbol", { length: 16 }).notNull(),
    strategyType: varchar("strategy_type", { length: 64 }).notNull(),
    status: savedStrategyStatus("status").notNull().default("open"),
    entryState: jsonb("entry_state").$type<StrategyState>().notNull(),
    entryEvaluation: jsonb("entry_evaluation")
      .$type<StrategyEvaluation>()
      .notNull(),
    entrySignedMarkValue: numeric("entry_signed_mark_value", {
      precision: 14,
      scale: 2,
    }).notNull(),
    capitalAtRisk: numeric("capital_at_risk", {
      precision: 14,
      scale: 2,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (table) => [
    index("saved_strategies_symbol_idx").on(table.symbol),
    index("saved_strategies_status_idx").on(table.status),
    index("saved_strategies_created_at_idx").on(table.createdAt),
  ],
);

export const strategySnapshots = optionsPlannerSchema.table(
  "strategy_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    strategyId: uuid("strategy_id")
      .notNull()
      .references(() => savedStrategies.id, { onDelete: "cascade" }),
    snapshotType: strategySnapshotType("snapshot_type").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    underlyingPrice: numeric("underlying_price", {
      precision: 14,
      scale: 4,
    }).notNull(),
    signedMarkValue: numeric("signed_mark_value", {
      precision: 14,
      scale: 2,
    }).notNull(),
    unrealizedProfitLoss: numeric("unrealized_profit_loss", {
      precision: 14,
      scale: 2,
    }).notNull(),
    returnOnRisk: numeric("return_on_risk", {
      precision: 12,
      scale: 6,
    }),
    legMarks: jsonb("leg_marks").$type<StrategySnapshotLegMark[]>().notNull(),
    quoteSource: varchar("quote_source", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("strategy_snapshots_strategy_id_idx").on(table.strategyId),
    index("strategy_snapshots_observed_at_idx").on(table.observedAt),
    index("strategy_snapshots_strategy_observed_idx").on(
      table.strategyId,
      table.observedAt,
    ),
  ],
);

export type SavedStrategy = typeof savedStrategies.$inferSelect;
export type NewSavedStrategy = typeof savedStrategies.$inferInsert;
export type StrategySnapshot = typeof strategySnapshots.$inferSelect;
export type NewStrategySnapshot = typeof strategySnapshots.$inferInsert;
