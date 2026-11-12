// Applies SQL migrations in db/migrations to the database in DATABASE_URL.
//
//   npm run db:migrate              apply pending migrations
//   npm run db:migrate -- --dry-run list pending migrations without applying
//
// Each file runs once, in name order (001_..., 002_...), inside a transaction.
// Applied files are recorded in the schema_migrations table, so running the
// command again only applies new files. Never edit a migration that has been
// applied; add a new file instead.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "@neondatabase/serverless";
import { getEnv } from "../src/env";

const dryRun = process.argv.includes("--dry-run");
const packageDir = path.resolve(import.meta.dirname, "..");
const migrationsDir = path.join(packageDir, "db", "migrations");

// Load the shared .env from the repository root (variables already set win).
const rootEnvFile = path.resolve(packageDir, "../../.env");
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

async function main() {
  const { DATABASE_URL } = getEnv("database");
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const files = readdirSync(migrationsDir)
      .filter((file) => /^\d+_.+\.sql$/.test(file))
      .sort();

    const tracked = await client.query<{ exists: boolean }>(
      "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists",
    );
    const trackingTableExists = tracked.rows[0]?.exists ?? false;

    const applied = new Set<string>();
    if (trackingTableExists) {
      const result = await client.query<{ name: string }>(
        "SELECT name FROM schema_migrations",
      );
      for (const row of result.rows) applied.add(row.name);
    }

    const pending = files.filter((file) => !applied.has(file));
    console.log(
      `${files.length} migration(s) found, ${applied.size} applied, ${pending.length} pending.`,
    );

    if (pending.length === 0) {
      console.log("Database is up to date.");
      return;
    }

    if (dryRun) {
      for (const file of pending) console.log(`  would apply: ${file}`);
      console.log("Dry run: nothing was changed.");
      return;
    }

    if (!trackingTableExists) {
      await client.query(`
        CREATE TABLE schema_migrations (
          name       text        PRIMARY KEY,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `);
    }

    for (const file of pending) {
      const sql = readFileSync(path.join(migrationsDir, file), "utf8");
      process.stdout.write(`  applying ${file} ... `);
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
          file,
        ]);
        await client.query("COMMIT");
        console.log("done");
      } catch (error) {
        await client.query("ROLLBACK");
        console.log("failed (rolled back)");
        throw error;
      }
    }

    console.log("All migrations applied.");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
