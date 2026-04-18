# revia-meal

Automates the daily lunch-order workflow for the HeyRevia US office: collect votes, pick a winner, and surface what to order. Replaces a manual Polly + DoorDash flow for ~15 people.

## Key ideas

- **Poll templates** group a set of restaurants with a recurring schedule. Each template instantiates a fresh poll every day it is scheduled to run. The office's "regular" and "healthy food" groups are two templates.
- **Rolling credits on restaurants.** Each user has 1 voting credit per poll, split evenly across the restaurants they pick. At close, each restaurant's share is added to that restaurant's accumulated balance **within the template**. The highest total wins; the winner's balance is reduced (exact rule deferred); everyone else's balance rolls forward — so options that keep almost-winning eventually win. See [docs/polls.md](docs/polls.md).
- **One template per user per day.** A user only participates in one template's poll on any given day. Accumulated credits live per `(template, restaurant)`, so the "regular" and "healthy" worlds are fully independent.
- **Allowlisted access.** Only emails an admin has pre-provisioned can sign in.

## Features (MVP)

- Google sign-in, restricted to the admin-provisioned allowlist
- Per-poll page with four states: scheduled / open / closed / cancelled
- Polls auto-cancel at close time if no one voted; admins can cancel a scheduled or open poll manually
- Dashboard of today's active polls across all templates
- History page listing every instantiated poll (closed and cancelled)
- `/leaderboard` page showing per-template restaurant balances and credit-event history
- User settings with per-user API key generation
- Admin pages: manage users/roles, restaurants, and poll templates
- External API (MVP, admin-only): fetch today's poll links + poll results — intended for a Slack cron

## Tech stack

Next.js (App Router) + TypeScript, Supabase (Postgres + Auth + Storage), Vercel hosting, Google OAuth.

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
5. (Once the seed script exists) `pnpm tsx scripts/seed-admin.ts` — inserts the bootstrap admin row if `users` is empty. No-op otherwise.
6. `pnpm dev`
7. (Optional) `npx skills experimental_install` — restores the agent skills pinned in [skills-lock.json](skills-lock.json) into `.claude/` and `.agents/` for Claude Code / other AI assistants. Not required to run the app.

Sign in at `/login` with the Google account matching `INITIAL_ADMIN_EMAIL` to get admin access; from there you can provision other users in `/admin/users`.

## License

See [LICENSE](LICENSE).
