# revia-meal

Automates the daily lunch-order workflow for the HeyRevia US office: collect votes, pick a winner, and surface what to order. Replaces a manual Polly + DoorDash flow for ~15 people.

## Key ideas

- **Poll templates** group a set of restaurants with a recurring schedule. Each template instantiates a fresh poll every day it is scheduled to run. The office's "regular" and "healthy food" groups are two templates.
- **Rolling voting credits.** Each user gets a fixed amount of voting power per day, distributed evenly across every restaurant they picked in a poll. **Un-winning votes are not wasted** — they roll forward so that minority tastes eventually get a turn. The exact credit-flow policy is deliberately not yet designed; see [docs/polls.md](docs/polls.md).
- **One template per user per day.** A user only participates in one template's poll on any given day. Rolling credits are tracked independently per template.
- **Allowlisted access.** Only emails an admin has pre-provisioned can sign in.

## Features (MVP)

- Google sign-in, restricted to the admin-provisioned allowlist
- Per-poll page with three states: not-started / ongoing / ended
- Dashboard of today's active polls across all templates
- History page listing every instantiated poll
- `/credits` page showing current rolling-credit balances per template
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

> The app has not been scaffolded yet. This section is a placeholder and will be replaced with real commands once the Next.js project and Supabase project are initialized.

Intended flow once scaffolded:

1. Clone the repo.
2. Copy `.env.example` to `.env.local` and fill in Supabase + Google OAuth credentials.
3. Run the Supabase migrations in `db/`.
4. `pnpm install && pnpm dev`.

## License

See [LICENSE](LICENSE).
