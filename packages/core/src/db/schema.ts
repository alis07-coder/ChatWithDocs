// Database schema, defined once in TypeScript.
//
// Drizzle uses this file for two things:
//   1. Type-safe queries: column names and types are checked by TypeScript.
//   2. Migrations: `npm run db:generate` compares this file with the last
//      migration and writes the SQL needed to update the database.
//
// How the data fits together:
//   knowledge_base 1 ─── * document 1 ─── * chunk
// A document is split into chunks; each chunk has an embedding (1024 numbers
// from Voyage AI) that captures its meaning. Searching means finding the
// chunks whose embeddings are closest to the question's.

import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

/** Length of each embedding. Must match the Voyage AI model's output. */
export const EMBEDDING_DIMENSIONS = 1024;

/** A named collection of documents. Search and chat run against one. */
export const knowledgeBases = pgTable(
  "knowledge_bases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("knowledge_bases_name_not_blank", sql`length(trim(${table.name})) > 0`),
  ],
);

/** One uploaded file. The original file isn't stored, only its text (in chunks). */
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    knowledgeBaseId: uuid("knowledge_base_id")
      .notNull()
      .references(() => knowledgeBases.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("documents_knowledge_base_id_idx").on(table.knowledgeBaseId),
    check("documents_size_bytes_non_negative", sql`${table.sizeBytes} >= 0`),
  ],
);

/**
 * A passage of a document plus its embedding. knowledge_base_id is copied
 * from the document so search can filter by knowledge base without a join.
 */
export const chunks = pgTable(
  "chunks",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    knowledgeBaseId: uuid("knowledge_base_id")
      .notNull()
      .references(() => knowledgeBases.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    tokenCount: integer("token_count"),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("chunks_document_id_chunk_index_unique").on(
      table.documentId,
      table.chunkIndex,
    ),
    index("chunks_knowledge_base_id_idx").on(table.knowledgeBaseId),
    // HNSW index for fast approximate nearest-neighbour search by cosine
    // distance. Without it, every search compares the question to every chunk.
    index("chunks_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    check("chunks_chunk_index_non_negative", sql`${table.chunkIndex} >= 0`),
    check(
      "chunks_token_count_non_negative",
      sql`${table.tokenCount} IS NULL OR ${table.tokenCount} >= 0`,
    ),
  ],
);
