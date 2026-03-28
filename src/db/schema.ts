import { pgSchema } from "drizzle-orm/pg-core";

/** Application tables should live in this schema (matches Drizzle Kit `schemaFilter`). */
export const optionsPlannerSchema = pgSchema("options_planner");
