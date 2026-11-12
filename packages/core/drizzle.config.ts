// Configuration for drizzle-kit, the tool that creates and applies migrations.
//
//   npm run db:generate   write a new SQL migration from changes in schema.ts
//   npm run db:migrate    apply pending migrations to the database
//   npm run db:studio     browse the database in your web browser

import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

// Load the shared .env from the repository root (variables already set win).
const rootEnvFile = path.resolve(process.cwd(), "../../.env");
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
