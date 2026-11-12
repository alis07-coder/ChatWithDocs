// Shapes of the rows our database functions return.
// The base types come straight from schema.ts, so they always match the tables.

import type { InferSelectModel } from "drizzle-orm";
import type { documents, knowledgeBases } from "./schema";

export { EMBEDDING_DIMENSIONS } from "./schema";

export type KnowledgeBase = InferSelectModel<typeof knowledgeBases> & {
  documentCount: number;
};

// Named DocumentRecord so it doesn't clash with the browser's `Document` type.
export type DocumentRecord = InferSelectModel<typeof documents> & {
  chunkCount: number;
};

/** A chunk ready to be saved. `chunkIndex` is its position in the list. */
export type NewChunk = {
  content: string;
  tokenCount?: number | null;
  embedding: number[];
};
