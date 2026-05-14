CREATE TABLE "options_planner"."position_refresh_workflows" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"run_id" varchar(128),
	"interval_seconds" integer DEFAULT 300 NOT NULL,
	"last_started_at" timestamp with time zone,
	"last_stopped_at" timestamp with time zone,
	"last_refresh_at" timestamp with time zone,
	"last_result" jsonb,
	"last_error" varchar(500),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "position_refresh_workflows_enabled_idx" ON "options_planner"."position_refresh_workflows" USING btree ("enabled");
