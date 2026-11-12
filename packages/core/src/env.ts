// Reads and validates environment variables.
//
// Variables are split into groups, one per external service. Each group is
// checked only when a feature asks for it, so you can run the app before you
// have keys for later phases (for example, upload works without Anthropic).

import { z } from "zod";

// An empty value in .env (e.g. `VOYAGE_API_KEY=`) counts as "not set".
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const required = () =>
  z.preprocess(emptyToUndefined, z.string({ error: "is required" }).trim());

const requiredUrl = () =>
  z.preprocess(
    emptyToUndefined,
    z
      .string({ error: "is required" })
      .trim()
      .pipe(z.url({ error: "must be a full URL, e.g. https://..." })),
  );

const withDefault = (defaultValue: string) =>
  z.preprocess(emptyToUndefined, z.string().trim().default(defaultValue));

const schemas = {
  supabase: z.object({
    SUPABASE_URL: requiredUrl(),
    SUPABASE_SERVICE_ROLE_KEY: required(),
    SUPABASE_STORAGE_BUCKET: withDefault("documents"),
  }),
  voyage: z.object({
    VOYAGE_API_KEY: required(),
    VOYAGE_MODEL: withDefault("voyage-3.5"),
  }),
  anthropic: z.object({
    ANTHROPIC_API_KEY: required(),
    CLAUDE_MODEL: withDefault("claude-opus-5-5"),
  }),
  mcp: z.object({
    MCP_SERVER_PORT: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({ error: "must be a port number, e.g. 3001" })
        .int({ error: "must be a port number, e.g. 3001" })
        .positive({ error: "must be a port number, e.g. 3001" })
        .default(3001),
    ),
    MCP_SERVER_URL: z.preprocess(
      emptyToUndefined,
      z
        .url({ error: "must be a full URL, e.g. http://localhost:3001/mcp" })
        .default("http://localhost:3001/mcp"),
    ),
  }),
};

export type EnvGroup = keyof typeof schemas;
type EnvFor<G extends EnvGroup> = z.infer<(typeof schemas)[G]>;

const groupLabels: Record<EnvGroup, string> = {
  supabase: "Supabase",
  voyage: "Voyage AI",
  anthropic: "Anthropic",
  mcp: "MCP server",
};

/** Thrown when a group's variables are missing or invalid. */
export class EnvError extends Error {
  constructor(
    public readonly group: EnvGroup,
    public readonly problems: string[],
  ) {
    super(
      [
        `${groupLabels[group]} is not configured:`,
        ...problems.map((problem) => `  - ${problem}`),
        "Add the values to the .env file at the repository root (see .env.example).",
      ].join("\n"),
    );
    this.name = "EnvError";
  }
}

function describeIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`);
}

/**
 * Returns the validated variables for one group, or throws an EnvError that
 * lists exactly which variables are missing.
 */
export function getEnv<G extends EnvGroup>(
  group: G,
  source: Record<string, string | undefined> = process.env,
): EnvFor<G> {
  const result = schemas[group].safeParse(source);
  if (!result.success) {
    throw new EnvError(group, describeIssues(result.error));
  }
  return result.data as EnvFor<G>;
}

export type EnvStatus = {
  group: EnvGroup;
  label: string;
  configured: boolean;
  problems: string[];
};

/**
 * Reports which groups are configured. Safe to show to users: it contains
 * variable names and problems, never the values.
 */
export function getEnvStatus(
  source: Record<string, string | undefined> = process.env,
): EnvStatus[] {
  return (Object.keys(schemas) as EnvGroup[]).map((group) => {
    const result = schemas[group].safeParse(source);
    return {
      group,
      label: groupLabels[group],
      configured: result.success,
      problems: result.success ? [] : describeIssues(result.error),
    };
  });
}
