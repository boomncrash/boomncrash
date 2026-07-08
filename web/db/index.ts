import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "./schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbInstance: any = null;

export function isDatabaseConfigured(): boolean {
  return !!(process.env.NETLIFY_DB_URL || process.env.DATABASE_URL);
}

export function getDb() {
  if (!isDatabaseConfigured()) {
    throw new Error("Database not configured");
  }
  if (!dbInstance) {
    dbInstance = drizzle({ schema });
  }
  return dbInstance as ReturnType<typeof drizzle<typeof schema>>;
}
