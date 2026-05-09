import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required for database access.");
  }

  return connectionString;
}

export function getDb() {
  return drizzle(getConnectionString(), { schema });
}

export type DbClient = ReturnType<typeof getDb>;
