-- pgvector adds the `vector` column type and similarity operators such as
-- `<=>` (cosine distance). It must be enabled before any table uses it.
CREATE EXTENSION IF NOT EXISTS vector;
