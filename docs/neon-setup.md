# Setting up Neon

ChatWithDocs stores its knowledge base in [Neon](https://neon.tech), a hosted Postgres database.
Postgres with the `pgvector` extension can store embeddings and find the closest ones to a
question, which is the "retrieval" part of RAG.

You need a free Neon account and about five minutes.

## 1. Create a project

1. Sign up or log in at <https://console.neon.tech>.
2. Click **New project**.
3. Fill in:
   - **Project name:** `chatwithdocs` (any name works)
   - **Postgres version:** the default (newest)
   - **Region:** the one closest to you, for faster queries
4. Click **Create project**.

Neon creates a database called `neondb` with a default role (user) for you.

## 2. Copy the connection string

1. On the project dashboard, click **Connect**.
2. Make sure the database is `neondb`, and copy the connection string. It looks like:

   ```
   postgresql://<user>:<password>@<endpoint>.<region>.aws.neon.tech/neondb?sslmode=require
   ```

   Keep `?sslmode=require` at the end: Neon only accepts encrypted connections.

> **Pooled or direct?** The **Connection pooling** toggle adds `-pooler` to the host name.
> Either works for this project. Pooled handles many short connections better (good for the
> web app); direct is better for long-running admin work. If you're unsure, keep the default.

## 3. Add it to `.env`

In the repository root, copy the template if you haven't already:

```bash
cp .env.example .env
```

Open `.env` in your editor and paste the connection string:

```dotenv
DATABASE_URL="postgresql://<user>:<password>@<endpoint>.<region>.aws.neon.tech/neondb?sslmode=require"
```

Quotes are optional but recommended. The connection string contains your password, so never
commit `.env` or paste it into issues or chats. `.env` is already listed in `.gitignore`.

> **Windows tip:** create `.env` with your editor or `cp`, not PowerShell's
> `Set-Content -Encoding utf8`. That command adds an invisible byte-order mark at the start
> of the file, which breaks the first variable's name.

## 4. Check the app can see it

Start the web app from the repository root:

```bash
npm run dev --workspace @chatwithdocs/web
```

Open <http://localhost:3000/api/health>. The database entry should say `"configured": true`.
This only checks the format of `DATABASE_URL`; the first real connection is made once the
database code is added.

Restart the dev server whenever you change `.env`. It's only read at startup.

## 5. pgvector

`pgvector` comes installed on Neon but has to be switched on in each database. You don't need
to do this by hand: the schema migration (next step of the project) runs

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

To try it yourself, open **SQL Editor** in the Neon console and run the statement above, then:

```sql
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
```

You should see one row with `vector` and its version.

## Free tier notes

- Storage is limited (0.5 GB per project at the time of writing). ChatWithDocs stores only the
  extracted text, chunks and embeddings, not the original files, so this goes a long way.
- An idle database scales to zero and wakes up on the next query. The first request after a
  break can take a second or two longer.

## Troubleshooting

| Problem | Fix |
|---|---|
| `/api/health` says `DATABASE_URL is required` | `.env` is missing, in the wrong folder (it must be in the repository root), or the dev server wasn't restarted |
| `must be a Postgres connection string` | The value must start with `postgresql://` or `postgres://`. Copy the connection string, not the `psql` command |
| Password authentication failed | Copy a fresh connection string from **Connect**, or reset the role's password in the Neon console |
| Connection timed out | Check your internet connection and that the Neon project isn't deleted or suspended |
