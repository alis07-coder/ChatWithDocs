// Connection to the Neon database through Drizzle.
//
// The Neon HTTP driver sends each query over HTTPS: there's no connection to
// keep open, and it works the same in Next.js and in the MCP server.
//
// Usage:
//   const db = getDb();
//   const rows = await db.select().from(knowledgeBases);
//
// Set DRIZZLE_LOG=true (or run in development) to print every SQL query
// Drizzle sends, so you can see exactly what reaches the database.

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { getEnv } from "../env";
import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;

let db: Db | undefined;

/** Returns the shared Drizzle database, creating it on first use. */
export function getDb(): Db {
  if (!db) {
    const { DATABASE_URL } = getEnv("database");
    db = drizzle({
      client: neon(DATABASE_URL),
      schema,
      logger:
        process.env.DRIZZLE_LOG === "true" ||
        process.env.NODE_ENV === "development",
    });
  }
  return db;
}

/** Postgres error codes we handle specially. */
export const PG_ERROR = {
  uniqueViolation: "23505",
  foreignKeyViolation: "23503",
} as const;

/**
 * True when `error` (or the error it wraps) is a Postgres error with the given
 * code. Drizzle wraps driver errors, so the code is usually on `error.cause`.
 */
export function isPgError(error: unknown, code: string): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 3 && current; depth++) {
    if (
      typeof current === "object" &&
      "code" in current &&
      (current as { code: unknown }).code === code
    ) {
      return true;
    }
    current =
      typeof current === "object" && "cause" in current
        ? (current as { cause: unknown }).cause
        : undefined;
  }
  return false;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when `value` looks like a UUID (the id format our tables use). */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
