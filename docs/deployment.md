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
3. Apply every SQL migration in order from [db/migrations/](../db/migrations) via **SQL Editor → New query → paste → Run**. Run them sequentially; don't batch them into one transaction (they're authored as independent scripts).
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

Every schema change is captured as a numbered `.sql` file in [db/migrations/](../db/migrations). When a new one lands on `main`:

1. Pull `main` on your checkout.
2. Open Supabase → **SQL Editor → New query**.
3. Paste the contents of the new migration file, hit **Run**, confirm it reports success.
4. Do the same for every environment you maintain (dev project, prod project).

Migrations are not tracked automatically in Supabase — the convention is "every file in `db/migrations/` has been applied to every environment exactly once." We don't have tooling to enforce this yet; discipline is the enforcement mechanism. If you're ever unsure whether a migration ran, you can check `information_schema.tables` / `information_schema.columns` to confirm the DDL took effect.

> **Tip**: when writing new migrations, include `create ... if not exists` / `alter ... if not exists` where practical so re-running is idempotent.

## Shipping a new release

The default flow is trunk-based with auto-deploy:

1. Branch off `main`, commit your changes, push.
2. Open a PR. Vercel produces a preview deploy automatically at `https://<branch>-<hash>.vercel.app`. The preview uses the **Preview** env vars — typically pointed at the production Supabase (we don't run a separate dev project yet) so behavior mirrors prod.
3. Review the preview, get a second pair of eyes on the PR if it touches shared state.
4. **If the PR includes a SQL migration:** apply it to production Supabase **before** merging (Supabase is backwards-compatible with pre-deploy code; the app code is not backwards-compatible with a pre-migration schema). Ordering matters: migration first, then code merge.
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
| `INITIAL_ADMIN_EMAIL`                  | `.env.local` + Vercel | Used by `pnpm seed-admin`. Ignored once `users` has at least one row. |
| `DEV_AUTH_BYPASS`                      | `.env.local` only     | Enables dev sign-in UI. Hard-gated by `NODE_ENV !== 'production'`. |

Also see [architecture.md § Environment variables](architecture.md#environment-variables).

## Common pitfalls

- **Google sign-in returns "not authorized."** The email isn't in the allowlist. An existing admin needs to add the email at `/admin/users`, then the user tries again. (If *no* admin exists yet, you haven't run `pnpm seed-admin` — see [Bootstrap the admin](#3-bootstrap-the-admin).)
- **"Sign in with Google" redirects to a blank page.** The production URL isn't in Supabase's allowed origins. Fix in **Authentication → URL Configuration**.
- **`SUPABASE_SECRET_KEY`/`NEXT_PUBLIC_*` mismatch between environments.** The app will look like it's loading but every data query returns empty. Double-check you pasted the values from the *correct* project (dev vs prod).
- **Migration appears to run but nothing changes.** The Supabase SQL Editor happily ignores trailing semicolons in comments and silently runs no statements. Make sure the editor is pointed at the right project and re-paste.
- **Preview deploys use production data.** If you experiment destructively on a branch, you are editing the live database. Either spin up a separate dev Supabase project (recommended once the team grows) or use the admin cancel-poll UI to roll back.
