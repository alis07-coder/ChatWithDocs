-- 001_init: tables for knowledge bases, documents and chunks.
--
-- How the data fits together:
--   knowledge_base 1 ─── * document 1 ─── * chunk
-- A document is split into chunks; each chunk has an embedding (a list of
-- 1024 numbers from Voyage AI) that captures its meaning. Searching means
-- finding the chunks whose embeddings are closest to the question's.

-- pgvector adds the `vector` column type and similarity operators.
CREATE EXTENSION IF NOT EXISTS vector;

-- A named collection of documents. Search and chat run against one knowledge base.
CREATE TABLE knowledge_bases (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- One uploaded file. The original file isn't stored, only its text (in chunks).
CREATE TABLE documents (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id uuid        NOT NULL REFERENCES knowledge_bases (id) ON DELETE CASCADE,
  name              text        NOT NULL,
  mime_type         text        NOT NULL,
  size_bytes        integer     NOT NULL CHECK (size_bytes >= 0),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX documents_knowledge_base_id_idx ON documents (knowledge_base_id);

-- A passage of a document plus its embedding.
-- knowledge_base_id is copied from the document so search can filter by
-- knowledge base without a join.
CREATE TABLE chunks (
  id                bigint      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  document_id       uuid        NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  knowledge_base_id uuid        NOT NULL REFERENCES knowledge_bases (id) ON DELETE CASCADE,
  chunk_index       integer     NOT NULL CHECK (chunk_index >= 0),
  content           text        NOT NULL,
  token_count       integer     CHECK (token_count >= 0),
  embedding         vector(1024) NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX chunks_knowledge_base_id_idx ON chunks (knowledge_base_id);

-- HNSW index for fast approximate nearest-neighbour search by cosine distance.
-- Without it, every search compares the question against every chunk.
CREATE INDEX chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops);
