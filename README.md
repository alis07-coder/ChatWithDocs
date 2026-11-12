# ChatWithDocs

A learning project for **RAG** (Retrieval-Augmented Generation) and **MCP** (Model Context Protocol).

Upload documents (PDF, DOCX, TXT, Markdown) into a knowledge base stored in a remote database,
search them, and chat with them through a Claude-powered bot that looks things up via its own MCP server.

## Features (planned)

- **Upload:** add documents to a knowledge base. Each one is split into chunks, embedded and stored in Neon (Postgres + pgvector).
- **Search:** find the passages most relevant to a question, with similarity scores.
- **MCP server:** exposes `search_knowledge_base` and `list_documents` tools to any MCP client, including Claude Desktop and Claude Code.
- **Chatbot:** Claude answers questions about a knowledge base by calling the MCP search tool, and shows its sources.

## Stack

Next.js · TypeScript · Neon (Postgres + pgvector) · Voyage AI embeddings · Claude · MCP TypeScript SDK

## Status

Work in progress. Features are being added step by step.
