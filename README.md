# revia-meal

Automates the daily lunch-order workflow for the HeyRevia US office: collect votes, pick a winner, and surface what to order. Replaces a manual Polly + DoorDash flow for ~15 people.

## Key ideas

- **Poll templates** group a set of restaurants with a recurring schedule. Each template instantiates a fresh poll every day it is scheduled to run. The office's "regular" and "healthy food" groups are two templates.
- **Rolling credits, per user per restaurant.** Each user has 1 voting credit per poll, split evenly across their picks. A losing pick is **banked** for that user against that restaurant within the template. On future polls, a user's banked credit only counts when they're present AND vote for that restaurant — so today's tribe drives today's outcome and minorities-with-patience eventually get their pick. The winner's contributing voters all get reset; everyone else's balances stay untouched. See [docs/polls.md](docs/polls.md).
- **One template per user per day.** A user only participates in one template's poll on any given day. Banked credits are scoped per `(user, template, restaurant)`, so the "regular" and "healthy" worlds are fully independent.
- **Allowlisted access.** Only emails an admin has pre-provisioned can sign in.

## Features (MVP)

- Google sign-in, restricted to the admin-provisioned allowlist
- Per-poll page with four states: scheduled / open / closed / cancelled
- Polls auto-cancel at close time if no one voted; admins can cancel a scheduled or open poll manually
- Dashboard of today's active polls across all templates
- History page listing every instantiated poll (closed and cancelled)
- `/people` spectrum page showing each user's vote counts aggregated by restaurant over a date range
- User settings with per-user API key generation
- Admin pages: manage users/roles, restaurants, and poll templates
- External API (MVP, admin-only): fetch today's poll links + poll results — intended for a Slack cron

## Tech stack

**Application runtime**

- **Next.js 16** (App Router, Server Components). This major has breaking changes from earlier Next — see [AGENTS.md](AGENTS.md).
- **React 19**, **TypeScript 5**.
- **Tailwind CSS 4**. No custom design-token layer.
- **Supabase** (Postgres + Auth) via **`@supabase/ssr` 0.10** and **`@supabase/supabase-js` 2**. Storage is not used.
- **Google OAuth 2.0**, brokered by Supabase Auth. The app never handles Google client credentials directly — see [docs/architecture.md](docs/architecture.md).
- **Node.js 24**, **pnpm 10**, **tsx** for one-off TypeScript scripts.
- Deployment target: **Vercel** (not yet provisioned).

**Development tooling**

- **Claude Code** — Anthropic's CLI coding agent. Drove most of the implementation. Feature flow documented in [AGENTS.md](AGENTS.md).
- **Playwright MCP** — browser automation for per-change verification. Not a permanent test suite.
- **Figma MCP** — integrates the Figma file with the agent for the in-progress design refresh. See [docs/design-brief.md](docs/design-brief.md) and [docs/design/](docs/design/).

## Docs

See [docs/](docs/) for the full design spec.

- [Architecture](docs/architecture.md)
- [Data model](docs/data-model.md)
- [Features and pages](docs/features.md)
- [Polls, voting, and rolling credits](docs/polls.md)
- [External API](docs/api.md)
- [Roadmap and open questions](docs/roadmap.md)

## Development setup

Prereqs: Node.js 20+ and pnpm 10+. Scaffold was created with `create-next-app` on Next.js 16 (App Router, TypeScript, Tailwind, ESLint).

1. `pnpm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase URL + keys and `INITIAL_ADMIN_EMAIL`.
3. Apply the schema to your Supabase project: run the SQL in [db/migrations/0001_initial_schema.sql](db/migrations/0001_initial_schema.sql) via the Supabase SQL editor (or the `supabase` CLI if you're using local dev).
4. Configure Google OAuth in the Supabase console (Authentication → Providers → Google). The app never touches the Google client id/secret directly — see [docs/architecture.md](docs/architecture.md) for the Google-Cloud-Console ↔ Supabase wiring.
5. Seed the bootstrap admin: `pnpm seed-admin`. Inserts the admin row from `INITIAL_ADMIN_EMAIL` if the `users` table is empty; no-op otherwise.
6. `pnpm dev`
7. (Optional) `npx skills experimental_install` — restores the agent skills pinned in [skills-lock.json](skills-lock.json) into `.claude/` and `.agents/` for Claude Code / other AI assistants. Not required to run the app.

Sign in at `/login` with the Google account matching `INITIAL_ADMIN_EMAIL` to get admin access; from there you can provision other users in `/admin/users`.

## License

See [LICENSE](LICENSE).
