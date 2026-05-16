CREATE TABLE "options_planner"."watchlist_symbols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "watchlist_symbols_symbol_unique" ON "options_planner"."watchlist_symbols" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "watchlist_symbols_created_at_idx" ON "options_planner"."watchlist_symbols" USING btree ("created_at");