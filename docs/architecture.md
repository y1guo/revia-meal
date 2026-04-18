# Architecture

## Stack

- **Next.js (App Router) + TypeScript** — one codebase for UI, server actions, and route handlers.
- **Supabase** — Postgres, Auth (Google OAuth), and Storage (if/when we need uploads).
- **Vercel** — hosts the Next.js app, including its serverless route handlers.
- **GitHub** — source control.

## Why this shape

- Single repo, single deploy — no standalone backend service.
- Supabase covers auth + db + storage, which removes a lot of glue code for a team of our size.
- Vercel's per-PR preview deploys keep iteration fast.

## Runtime shape

```
+--------------------+        +-----------------------+
|     Browser        | <----> |  Next.js on Vercel    |
|  (React UI, SSR)   |        |  Route handlers       |
+--------------------+        |  + Server actions     |
                              +----------+------------+
                                         |
                                         v
                              +-----------------------+
                              |      Supabase         |
                              |  Postgres / Auth      |
                              +-----------------------+
```

## Folder layout (intended, TBD after scaffold)

```
/app            # Next.js app router pages + route handlers
/lib            # shared utilities (supabase client, auth helpers)
/db             # SQL migrations
/docs           # this folder
```

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
INITIAL_ADMIN_EMAIL=
```

`INITIAL_ADMIN_EMAIL` is used **only** by the seed migration that bootstraps the first admin when the `users` table is empty. Once at least one admin exists, the value is ignored — see [data-model.md](data-model.md) for details.

## Deployment

- `main` auto-deploys to Vercel production.
- Feature branches get preview deploys per PR.
- One production Supabase project; optionally a separate dev project.

## Row-level security

We start **without RLS**: all users are trusted internal staff and all writes go through our server. RLS will be revisited when we add meaningful role separation or expose data beyond the current team. See [roadmap.md](roadmap.md).
