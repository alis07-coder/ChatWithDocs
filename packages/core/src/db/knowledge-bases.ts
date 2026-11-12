import { count, desc, eq, getTableColumns } from "drizzle-orm";
import { getDb, isPgError, isUuid, PG_ERROR } from "./client";
import { documents, knowledgeBases } from "./schema";
import type { KnowledgeBase } from "./types";

// Every knowledge base column, plus how many documents it has.
const withDocumentCount = {
  ...getTableColumns(knowledgeBases),
  documentCount: count(documents.id),
};

/** Creates a knowledge base. Throws if the name is empty or already taken. */
export async function createKnowledgeBase(input: {
  name: string;
  description?: string | null;
}): Promise<KnowledgeBase> {
  const name = input.name.trim();
  if (!name) throw new Error("Knowledge base name is required.");
  const description = input.description?.trim() || null;

  try {
    const [created] = await getDb()
      .insert(knowledgeBases)
      .values({ name, description })
      .returning();
    return { ...created!, documentCount: 0 };
  } catch (error) {
    if (isPgError(error, PG_ERROR.uniqueViolation)) {
      throw new Error(`A knowledge base named "${name}" already exists.`);
    }
    throw error;
  }
}

/** Lists all knowledge bases, newest first, with how many documents each has. */
export async function listKnowledgeBases(): Promise<KnowledgeBase[]> {
  return getDb()
    .select(withDocumentCount)
    .from(knowledgeBases)
    .leftJoin(documents, eq(documents.knowledgeBaseId, knowledgeBases.id))
    .groupBy(knowledgeBases.id)
    .orderBy(desc(knowledgeBases.createdAt));
}

/** Returns one knowledge base, or null if it doesn't exist. */
export async function getKnowledgeBase(
  id: string,
): Promise<KnowledgeBase | null> {
  if (!isUuid(id)) return null;
  const [row] = await getDb()
    .select(withDocumentCount)
    .from(knowledgeBases)
    .leftJoin(documents, eq(documents.knowledgeBaseId, knowledgeBases.id))
    .where(eq(knowledgeBases.id, id))
    .groupBy(knowledgeBases.id);
  return row ?? null;
}

/**
 * Deletes a knowledge base and, through ON DELETE CASCADE, all its documents
 * and chunks. Returns false if it didn't exist.
 */
export async function deleteKnowledgeBase(id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const deleted = await getDb()
    .delete(knowledgeBases)
    .where(eq(knowledgeBases.id, id))
    .returning({ id: knowledgeBases.id });
  return deleted.length > 0;
}
