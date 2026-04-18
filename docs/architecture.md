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
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
INITIAL_ADMIN_EMAIL=
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the successor to the legacy `anon` key) is safe to ship to the browser and is subject to RLS if/when we enable it. `SUPABASE_SECRET_KEY` (the successor to the legacy `service_role` key) is server-only and bypasses RLS — never expose it client-side.

`INITIAL_ADMIN_EMAIL` is used **only** by the seed script that bootstraps the first admin when the `users` table is empty. Once at least one admin exists, the value is ignored — see [data-model.md](data-model.md) for details.

## Google OAuth

Google OAuth is configured inside Supabase, not in the app's environment. One-time setup per environment:

1. In Google Cloud Console → APIs & Services → Credentials, create an **OAuth 2.0 Client ID** (application type: Web application).
2. In Supabase → Authentication → Providers → Google, copy the callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`) and paste it into the Google client's **Authorized redirect URIs**.
3. Paste the Google Client ID + Client Secret into Supabase's Google provider, enable, save.
4. In Supabase → Authentication → URL Configuration, add the app origins allowed to initiate sign-in and receive the redirect — `http://localhost:3000` for dev, and the Vercel URL for prod.

The app itself never touches Google credentials; it calls `supabase.auth.signInWithOAuth({ provider: 'google' })` and lets Supabase handle the OAuth dance.

### Bypassing Google in local dev

For testing from browsers that aren't signed into Google, set `DEV_AUTH_BYPASS=true` in `.env.local`. The login page gains a "Dev sign-in" section listing every allowlisted active user; clicking one mints a Supabase session for that user via `auth.admin.generateLink({ type: 'magiclink' })` + `auth.verifyOtp`. The flag is hard-gated by `NODE_ENV !== 'production'`, so it has no effect if it leaks into a Vercel deploy. Allowlist + `is_active` are still enforced — the bypass skips Google, not our auth checks.

## Deployment

- `main` auto-deploys to Vercel production.
- Feature branches get preview deploys per PR.
- One production Supabase project; optionally a separate dev project.

## Row-level security

We start **without RLS**: all users are trusted internal staff and all writes go through our server. RLS will be revisited when we add meaningful role separation or expose data beyond the current team. See [roadmap.md](roadmap.md).
