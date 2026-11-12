import { count, desc, eq, getTableColumns } from "drizzle-orm";
import { getDb, isPgError, isUuid, PG_ERROR } from "./client";
import { chunks, documents } from "./schema";
import type { DocumentRecord } from "./types";

// Every document column, plus how many chunks it has.
const withChunkCount = {
  ...getTableColumns(documents),
  chunkCount: count(chunks.id),
};

/** Saves a document's details. Its chunks are added with insertChunks(). */
export async function createDocument(input: {
  knowledgeBaseId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<DocumentRecord> {
  const name = input.name.trim();
  if (!name) throw new Error("Document name is required.");
  if (!isUuid(input.knowledgeBaseId)) {
    throw new Error("Knowledge base not found.");
  }
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes < 0) {
    throw new Error("Document size must be a whole number of bytes.");
  }

  try {
    const [created] = await getDb()
      .insert(documents)
      .values({
        knowledgeBaseId: input.knowledgeBaseId,
        name,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
      })
      .returning();
    return { ...created!, chunkCount: 0 };
  } catch (error) {
    if (isPgError(error, PG_ERROR.foreignKeyViolation)) {
      throw new Error("Knowledge base not found.");
    }
    throw error;
  }
}

/** Lists a knowledge base's documents, newest first, with their chunk counts. */
export async function listDocuments(
  knowledgeBaseId: string,
): Promise<DocumentRecord[]> {
  if (!isUuid(knowledgeBaseId)) return [];
  return getDb()
    .select(withChunkCount)
    .from(documents)
    .leftJoin(chunks, eq(chunks.documentId, documents.id))
    .where(eq(documents.knowledgeBaseId, knowledgeBaseId))
    .groupBy(documents.id)
    .orderBy(desc(documents.createdAt));
}

/** Returns one document, or null if it doesn't exist. */
export async function getDocument(id: string): Promise<DocumentRecord | null> {
  if (!isUuid(id)) return null;
  const [row] = await getDb()
    .select(withChunkCount)
    .from(documents)
    .leftJoin(chunks, eq(chunks.documentId, documents.id))
    .where(eq(documents.id, id))
    .groupBy(documents.id);
  return row ?? null;
}

/** Deletes a document and (through ON DELETE CASCADE) its chunks. */
export async function deleteDocument(id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const deleted = await getDb()
    .delete(documents)
    .where(eq(documents.id, id))
    .returning({ id: documents.id });
  return deleted.length > 0;
}
