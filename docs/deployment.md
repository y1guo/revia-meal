# Deployment and release

Everything you need to stand up a new revia-meal environment from scratch, apply schema changes, and ship a new release. For the architectural overview read [architecture.md](architecture.md) first; this doc is the operational sibling.

## One-time setup (new environment)

### 1. Supabase project

1. Sign in to [supabase.com](https://supabase.com) and **New project**.
   - Pick a name (`revia-meal-prod`, `revia-meal-dev`, etc.).
   - Region: pick the one closest to your users.
   - Save the database password somewhere safe — you will not see it again in the dashboard.
2. Once the project finishes provisioning, grab credentials from **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `Publishable key` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the successor to legacy `anon`)
   - `Secret key` → `SUPABASE_SECRET_KEY` (the successor to legacy `service_role`). Server-only, bypasses RLS. Never paste into a client-side file.
3. Apply every SQL migration in [db/migrations/](../db/migrations) with the runner:
   ```sh
   pnpm migrate
   ```
   Requires `DATABASE_URL` in `.env.local` — grab the direct Postgres URI from **Project Settings → Database → Connection string** (pick **URI**, make sure **Use connection pooling** is OFF — the pooler runs in transaction mode and blocks DDL). Format: `postgres://postgres:PASSWORD@HOST:5432/postgres`. The runner creates a `schema_migrations` tracking table and applies only the files that haven't run against this database yet.
4. Configure Google OAuth in **Authentication → Providers → Google**. The full Google-Cloud-Console ↔ Supabase wiring (what to paste where) is documented in [architecture.md § Google OAuth](architecture.md#google-oauth).
5. In **Authentication → URL Configuration**, add every app origin that will hit sign-in. At minimum: `http://localhost:3000` for dev and your production Vercel URL (e.g. `https://meal.heyrevia.ai`).

### 2. Vercel project

1. Create a Vercel account if you don't have one and connect it to the GitHub org.
2. **Add New Project** → pick the `revia-meal` repo. Vercel auto-detects Next.js; accept the defaults.
3. Set Environment Variables (all four, both for Production and Preview environments):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` (mark as "sensitive" in the Vercel UI)
   - `INITIAL_ADMIN_EMAIL` — the email of the person who will become the bootstrap admin on the first sign-in.
   - Leave `DEV_AUTH_BYPASS` **unset** in Vercel. It is hard-gated by `NODE_ENV !== 'production'` inside the app, but don't tempt fate.
4. Click **Deploy**. First build should succeed in ~1 minute. Vercel will assign a `*.vercel.app` URL.
5. Point your real domain at the Vercel app (Domains tab). Add the production URL to Supabase's allowed origins (step 1.5 above).

### 3. Bootstrap the admin

The `users` table is empty on a fresh project. The first admin is seeded from `INITIAL_ADMIN_EMAIL`:

```sh
pnpm seed-admin
```

The script reads the same `.env.local`, connects as the service role, and inserts the admin row only if `users` is empty. No-op on subsequent runs.

For the production environment, run the seed from a local checkout with a *temporary* `.env.local` pointing at the production Supabase (copy the three env vars over, run once, delete the file). Or use the Supabase SQL editor to insert the row directly — same effect.

### 4. First sign-in

Go to the production URL, click **Sign in with Google**, use the Google account matching `INITIAL_ADMIN_EMAIL`. You should land on `/` as an admin. From there, add the rest of the team in `/admin/users`.

## Applying new schema migrations

Every schema change is a numbered `.sql` file in [db/migrations/](../db/migrations). The [migration runner](../scripts/migrate.ts) applies pending ones and records every applied file (with a sha256 checksum) in a `schema_migrations` table, so you never have to remember what's already run.

```sh
pnpm migrate          # apply pending migrations
pnpm migrate:status   # list applied + pending, read-only
```

The runner needs `DATABASE_URL` in `.env.local` — the direct Postgres URI from Supabase (see [one-time setup step 1.3](#1-supabase-project)). Point it at whichever environment you want to migrate; to ship a migration, run `pnpm migrate` first against production Supabase, **then** merge the code.

### Onboarding an existing environment (one time)

If the target database was set up before this runner existed, its schema is already caught up but `schema_migrations` is empty. Baseline it to catch the tracking table up to reality:

```sh
pnpm migrate:baseline
```

This inserts a row for every file in `db/migrations/` **without running any SQL**. It refuses to run if the table already has rows. Only do this once per environment, only when you're sure every migration is already applied.

### Resetting an environment (destructive)

Sometimes you want to replay every migration from scratch — rebuilding a staging project, testing that a fresh run produces the expected schema, etc. Paste the block below into **Supabase → SQL Editor** of the target project. It wipes only the `public` schema (Supabase's own `auth`, `storage`, `realtime`, … are untouched) and re-grants the role privileges that `drop schema cascade` silently removes along the way.

```sql
drop schema public cascade;
create schema public;

-- Schema-level access
grant all on schema public to postgres, authenticated, anon, service_role;
grant usage on schema public to postgres, authenticated, anon, service_role;

-- Privileges on existing + future objects. `drop schema cascade` nukes the
-- default-privilege settings along with everything else; forgetting these
-- makes server-side queries fail with empty/opaque errors even though the
-- tables look fine in the dashboard.
grant all on all tables in schema public to postgres, authenticated, service_role;
grant all on all sequences in schema public to postgres, authenticated, service_role;
grant all on all functions in schema public to postgres, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, authenticated, service_role;
```

Then:

```sh
pnpm migrate           # creates schema_migrations and applies all 6 files
pnpm seed-admin        # re-seeds the bootstrap admin in the now-empty users table
```

If the API layer returns empty bodies after a reset, PostgREST's schema cache is stale — force a reload once:

```sql
notify pgrst, 'reload schema';
```

Your existing `auth.users` rows survive the wipe (different schema), so Google sign-in still works for everyone already in the Supabase auth users list.

### Guardrails

- **Never edit an already-applied migration.** The runner compares on-disk checksum against the recorded checksum; a mismatch aborts the run. Write a new migration that amends the schema instead.
- **Idempotent DDL is still a good idea.** `create … if not exists` / `alter … if not exists` lets you re-point a baselined environment at a slightly newer migration without surprises, and makes ad-hoc recovery easier.
- **No down-migrations.** The runner is one-way — if you need to reverse a change, write the reverse SQL by hand in the SQL editor (or as a new forward migration that undoes the damage).

## Shipping a new release

The default flow is trunk-based with auto-deploy:

1. Branch off `main`, commit your changes, push.
2. Open a PR. Vercel produces a preview deploy automatically at `https://<branch>-<hash>.vercel.app`. The preview uses the **Preview** env vars — typically pointed at the production Supabase (we don't run a separate dev project yet) so behavior mirrors prod.
3. Review the preview, get a second pair of eyes on the PR if it touches shared state.
4. **If the PR includes a SQL migration:** run `pnpm migrate` with `DATABASE_URL` pointing at production Supabase **before** merging (Supabase is backwards-compatible with pre-deploy code; the app code is not backwards-compatible with a pre-migration schema). Ordering matters: migration first, then code merge.
5. Merge to `main`. Vercel's Production environment auto-deploys on push to `main`. ETA ~1 minute.
6. Smoke-test the live URL. If it's broken, revert the PR on `main` — Vercel re-deploys the reverted tree automatically.

### Rolling back

- **Code**: `git revert <sha>` of the bad commit, push to `main`, Vercel redeploys.
- **Schema**: there's no automated down-migration. If you need to reverse a change, write the reverse SQL by hand and run it in the SQL Editor. Before any destructive migration on production, use Supabase's **Database → Backups** tab to trigger a fresh backup (or rely on the daily one if the change isn't urgent).

### Hotfix without preview

If prod is broken and the fix is small:

1. Commit straight to a branch named `hotfix/...`.
2. Open the PR and merge as soon as the preview looks OK — don't wait for cycles. Vercel's preview finishes in under a minute.

No "staging" environment exists. The preview deploys are what we have; that is fine for a 15-person internal app, not for a public product.

## Environment variables in one place

| Name                                   | Where it's set        | Purpose                                                            |
| -------------------------------------- | --------------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | `.env.local` + Vercel | Public — used from the browser.                                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` + Vercel | Public — safe to ship to the browser; subject to RLS (when added). |
| `SUPABASE_SECRET_KEY`                  | `.env.local` + Vercel | **Server-only**. Bypasses RLS. Never log or expose.                |
| `DATABASE_URL`                         | `.env.local` only     | Direct Postgres URI used by `pnpm migrate` / `pnpm migrate:baseline`. Not needed by the runtime app. |
| `INITIAL_ADMIN_EMAIL`                  | `.env.local` + Vercel | Used by `pnpm seed-admin`. Ignored once `users` has at least one row. |
| `DEV_AUTH_BYPASS`                      | `.env.local` only     | Enables dev sign-in UI. Hard-gated by `NODE_ENV !== 'production'`. |

Also see [architecture.md § Environment variables](architecture.md#environment-variables).

## Common pitfalls

- **Google sign-in returns "not authorized."** The email isn't in the allowlist. An existing admin needs to add the email at `/admin/users`, then the user tries again. (If *no* admin exists yet, you haven't run `pnpm seed-admin` — see [Bootstrap the admin](#3-bootstrap-the-admin).)
- **"Sign in with Google" redirects to a blank page.** The production URL isn't in Supabase's allowed origins. Fix in **Authentication → URL Configuration**.
- **`SUPABASE_SECRET_KEY`/`NEXT_PUBLIC_*` mismatch between environments.** The app will look like it's loading but every data query returns empty. Double-check you pasted the values from the *correct* project (dev vs prod).
- **Preview deploys use production data.** If you experiment destructively on a branch, you are editing the live database. Either spin up a separate dev Supabase project (recommended once the team grows) or use the admin cancel-poll UI to roll back.
