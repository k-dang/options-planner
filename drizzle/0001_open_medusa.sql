CREATE TABLE "options_planner"."app_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commissions" jsonb NOT NULL,
	"defaults" jsonb NOT NULL,
	"provider_config" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "options_planner"."instrument" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" varchar(32) NOT NULL,
	"name" text NOT NULL,
	"asset_type" varchar(32) NOT NULL,
	"currency" varchar(8) NOT NULL,
	"exchange" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instrument_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "options_planner"."option_contract" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"expiry" date NOT NULL,
	"strike" numeric(20, 6) NOT NULL,
	"right" char(1) NOT NULL,
	"exercise_style" varchar(16) NOT NULL,
	"contract_symbol" varchar(64) NOT NULL,
	"multiplier" integer DEFAULT 100 NOT NULL,
	CONSTRAINT "option_contract_contract_symbol_unique" UNIQUE("contract_symbol")
);
--> statement-breakpoint
CREATE TABLE "options_planner"."saved_strategy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"template_id" uuid,
	"name" varchar(512) NOT NULL,
	"status" varchar(32) NOT NULL,
	"entry_ts" timestamp with time zone NOT NULL,
	"close_ts" timestamp with time zone,
	"builder_state" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "options_planner"."saved_strategy_leg" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saved_strategy_id" uuid NOT NULL,
	"kind" varchar(16) NOT NULL,
	"side" varchar(8) NOT NULL,
	"qty" numeric(20, 6) NOT NULL,
	"option_contract_id" uuid,
	"entry_price" numeric(20, 6),
	"close_price" numeric(20, 6)
);
--> statement-breakpoint
CREATE TABLE "options_planner"."saved_strategy_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saved_strategy_id" uuid NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"net_value" numeric(20, 6) NOT NULL,
	"unrealized_pnl" numeric(20, 6) NOT NULL,
	"realized_pnl" numeric(20, 6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "options_planner"."strategy_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text,
	"legs_spec" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "strategy_template_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "options_planner"."option_contract" ADD CONSTRAINT "option_contract_instrument_id_instrument_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "options_planner"."instrument"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options_planner"."saved_strategy" ADD CONSTRAINT "saved_strategy_instrument_id_instrument_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "options_planner"."instrument"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options_planner"."saved_strategy" ADD CONSTRAINT "saved_strategy_template_id_strategy_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "options_planner"."strategy_template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options_planner"."saved_strategy_leg" ADD CONSTRAINT "saved_strategy_leg_saved_strategy_id_saved_strategy_id_fk" FOREIGN KEY ("saved_strategy_id") REFERENCES "options_planner"."saved_strategy"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options_planner"."saved_strategy_leg" ADD CONSTRAINT "saved_strategy_leg_option_contract_id_option_contract_id_fk" FOREIGN KEY ("option_contract_id") REFERENCES "options_planner"."option_contract"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options_planner"."saved_strategy_snapshot" ADD CONSTRAINT "saved_strategy_snapshot_saved_strategy_id_saved_strategy_id_fk" FOREIGN KEY ("saved_strategy_id") REFERENCES "options_planner"."saved_strategy"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "instrument_symbol_idx" ON "options_planner"."instrument" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "option_contract_instrument_expiry_idx" ON "options_planner"."option_contract" USING btree ("instrument_id","expiry");--> statement-breakpoint
CREATE INDEX "saved_strategy_instrument_idx" ON "options_planner"."saved_strategy" USING btree ("instrument_id");--> statement-breakpoint
CREATE INDEX "saved_strategy_status_idx" ON "options_planner"."saved_strategy" USING btree ("status");--> statement-breakpoint
CREATE INDEX "saved_strategy_leg_strategy_idx" ON "options_planner"."saved_strategy_leg" USING btree ("saved_strategy_id");--> statement-breakpoint
CREATE INDEX "saved_strategy_snapshot_strategy_ts_idx" ON "options_planner"."saved_strategy_snapshot" USING btree ("saved_strategy_id","ts");