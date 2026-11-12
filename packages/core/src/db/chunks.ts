import { getDb } from "./client";
import { chunks } from "./schema";
import { EMBEDDING_DIMENSIONS, type DocumentRecord, type NewChunk } from "./types";

// Rows are sent in batches so a long document doesn't become one huge request
// (each embedding alone is 1024 numbers).
const BATCH_SIZE = 100;

function validateChunk(chunk: NewChunk, index: number): void {
  if (!chunk.content.trim()) {
    throw new Error(`Chunk ${index} has no text.`);
  }
  if (chunk.embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Chunk ${index} has ${chunk.embedding.length} embedding values; expected ${EMBEDDING_DIMENSIONS}.`,
    );
  }
  if (!chunk.embedding.every(Number.isFinite)) {
    throw new Error(`Chunk ${index} has an invalid embedding value.`);
  }
}

/**
 * Saves a document's chunks with their embeddings. `chunkIndex` is each
 * chunk's position in `newChunks`. Returns how many rows were inserted.
 */
export async function insertChunks(
  document: Pick<DocumentRecord, "id" | "knowledgeBaseId">,
  newChunks: NewChunk[],
): Promise<number> {
  newChunks.forEach(validateChunk);
  const db = getDb();
  let inserted = 0;

  for (let start = 0; start < newChunks.length; start += BATCH_SIZE) {
    const batch = newChunks.slice(start, start + BATCH_SIZE);
    const rows = await db
      .insert(chunks)
      .values(
        batch.map((chunk, i) => ({
          documentId: document.id,
          knowledgeBaseId: document.knowledgeBaseId,
          chunkIndex: start + i,
          content: chunk.content,
          tokenCount: chunk.tokenCount ?? null,
          embedding: chunk.embedding, // Drizzle converts number[] to a pgvector value
        })),
      )
      .returning({ id: chunks.id });
    inserted += rows.length;
  }

  return inserted;
}
