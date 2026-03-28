import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const optionsPlannerSchema = pgSchema("options_planner");

export const optionContractRight = optionsPlannerSchema.enum(
  "option_contract_right",
  ["C", "P"],
);

export const instruments = optionsPlannerSchema.table(
  "instrument",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    symbol: varchar("symbol", { length: 32 }).notNull().unique(),
    name: text("name").notNull(),
    assetType: varchar("asset_type", { length: 32 }).notNull(),
    currency: varchar("currency", { length: 8 }).notNull(),
    exchange: varchar("exchange", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("instrument_symbol_idx").on(table.symbol)],
);

export const optionContracts = optionsPlannerSchema.table(
  "option_contract",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    expiry: date("expiry").notNull(),
    strike: numeric("strike", { precision: 20, scale: 6 }).notNull(),
    right: optionContractRight("right").notNull(),
    exerciseStyle: varchar("exercise_style", { length: 16 }).notNull(),
    contractSymbol: varchar("contract_symbol", { length: 64 })
      .notNull()
      .unique(),
    multiplier: integer("multiplier").notNull().default(100),
  },
  (table) => [
    index("option_contract_instrument_expiry_idx").on(
      table.instrumentId,
      table.expiry,
    ),
  ],
);

export const strategyTemplates = optionsPlannerSchema.table(
  "strategy_template",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 256 }).notNull().unique(),
    description: text("description"),
    legsSpec: jsonb("legs_spec").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const savedStrategies = optionsPlannerSchema.table(
  "saved_strategy",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "restrict" }),
    templateId: uuid("template_id").references(() => strategyTemplates.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 512 }).notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    entryTs: timestamp("entry_ts", { withTimezone: true }).notNull(),
    closeTs: timestamp("close_ts", { withTimezone: true }),
    builderState: jsonb("builder_state").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => [
    index("saved_strategy_instrument_idx").on(table.instrumentId),
    index("saved_strategy_status_idx").on(table.status),
  ],
);

export const savedStrategyLegs = optionsPlannerSchema.table(
  "saved_strategy_leg",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    savedStrategyId: uuid("saved_strategy_id")
      .notNull()
      .references(() => savedStrategies.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 16 }).notNull(),
    side: varchar("side", { length: 8 }).notNull(),
    qty: numeric("qty", { precision: 20, scale: 6 }).notNull(),
    optionContractId: uuid("option_contract_id").references(
      () => optionContracts.id,
      { onDelete: "set null" },
    ),
    entryPrice: numeric("entry_price", { precision: 20, scale: 6 }),
    closePrice: numeric("close_price", { precision: 20, scale: 6 }),
  },
  (table) => [
    index("saved_strategy_leg_strategy_idx").on(table.savedStrategyId),
  ],
);

export const savedStrategySnapshots = optionsPlannerSchema.table(
  "saved_strategy_snapshot",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    savedStrategyId: uuid("saved_strategy_id")
      .notNull()
      .references(() => savedStrategies.id, { onDelete: "cascade" }),
    ts: timestamp("ts", { withTimezone: true }).notNull(),
    netValue: numeric("net_value", { precision: 20, scale: 6 }).notNull(),
    unrealizedPnl: numeric("unrealized_pnl", {
      precision: 20,
      scale: 6,
    }).notNull(),
    realizedPnl: numeric("realized_pnl", { precision: 20, scale: 6 }).notNull(),
  },
  (table) => [
    index("saved_strategy_snapshot_strategy_ts_idx").on(
      table.savedStrategyId,
      table.ts,
    ),
  ],
);

export const appSettings = optionsPlannerSchema.table("app_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  commissions: jsonb("commissions").notNull(),
  defaults: jsonb("defaults").notNull(),
  providerConfig: jsonb("provider_config").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`),
});
