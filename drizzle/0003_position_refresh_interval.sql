ALTER TABLE "options_planner"."position_refresh_workflows" ALTER COLUMN "interval_seconds" SET DEFAULT 14400;
--> statement-breakpoint
UPDATE "options_planner"."position_refresh_workflows"
SET "interval_seconds" = 14400,
    "updated_at" = now()
WHERE "id" = 'open_positions';
