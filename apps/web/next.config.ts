import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// Next.js only reads .env files from this app's folder (apps/web).
// Load the shared .env from the repository root as well, so the web app and
// the MCP server use one set of keys. Variables that are already set (for
// example by your shell or hosting provider) are not overwritten.
const rootEnvFile = path.resolve(process.cwd(), "../../.env");
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
