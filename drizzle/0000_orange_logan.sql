CREATE SCHEMA "options_planner";
--> statement-breakpoint
CREATE TYPE "options_planner"."saved_strategy_status" AS ENUM('open', 'closed', 'expired');--> statement-breakpoint
CREATE TYPE "options_planner"."strategy_snapshot_type" AS ENUM('entry', 'mark', 'close');--> statement-breakpoint
CREATE TABLE "options_planner"."saved_strategies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"symbol" varchar(16) NOT NULL,
	"strategy_type" varchar(64) NOT NULL,
	"status" "options_planner"."saved_strategy_status" DEFAULT 'open' NOT NULL,
	"entry_state" jsonb NOT NULL,
	"entry_evaluation" jsonb NOT NULL,
	"entry_signed_mark_value" numeric(14, 2) NOT NULL,
	"capital_at_risk" numeric(14, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "options_planner"."strategy_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strategy_id" uuid NOT NULL,
	"snapshot_type" "options_planner"."strategy_snapshot_type" NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"underlying_price" numeric(14, 4) NOT NULL,
	"signed_mark_value" numeric(14, 2) NOT NULL,
	"unrealized_profit_loss" numeric(14, 2) NOT NULL,
	"return_on_risk" numeric(12, 6),
	"leg_marks" jsonb NOT NULL,
	"quote_source" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "options_planner"."strategy_snapshots" ADD CONSTRAINT "strategy_snapshots_strategy_id_saved_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "options_planner"."saved_strategies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saved_strategies_symbol_idx" ON "options_planner"."saved_strategies" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "saved_strategies_status_idx" ON "options_planner"."saved_strategies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "saved_strategies_created_at_idx" ON "options_planner"."saved_strategies" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "strategy_snapshots_strategy_id_idx" ON "options_planner"."strategy_snapshots" USING btree ("strategy_id");--> statement-breakpoint
CREATE INDEX "strategy_snapshots_observed_at_idx" ON "options_planner"."strategy_snapshots" USING btree ("observed_at");--> statement-breakpoint
CREATE INDEX "strategy_snapshots_strategy_observed_idx" ON "options_planner"."strategy_snapshots" USING btree ("strategy_id","observed_at");