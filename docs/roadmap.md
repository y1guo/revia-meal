# Roadmap and open questions

## MVP scope (what we're building first)

- Google login restricted to the admin-provisioned allowlist.
- Restaurant catalog CRUD.
- Poll template CRUD (name, schedule, restaurant set).
- Lazy daily poll instantiation from active templates.
- Dedicated per-poll URL with not-started / ongoing / ended views.
- Voting: one template per user per day, credits distributed evenly across picks.
- Rolling credit balances per user per template — with a **placeholder policy** (see below).
- History page, credits page, user settings with per-user API keys.
- Admin API endpoints: "get today's poll links", "get poll results".

## Explicitly deferred

- **Rolling-credit algorithm design.** The real policy (decay, weighting, winner deduction rules, new-user seeding, caps) is a dedicated design session, not something to decide in passing. See [polls.md](polls.md) for the open questions.
- **DoorDash automation.** For MVP we just surface the winner. Creating the group order stays manual.
- **Voting via API.** Users can generate keys, but regular-user endpoints are not built in MVP.
- **Email / Slack notifications from inside the app.** The Slack cron is external and pulls through the API.

## Future / later

- Supabase RLS once role separation matters beyond the current small team.
- Stats dashboards (per-restaurant, per-user) beyond the minimal history and credits views.
- Receipt / photo uploads via Supabase Storage.
- Multi-office / multi-team support — today the app assumes one office.
- A "dry run" view for admins to simulate how a proposed credit-policy change would have affected historical polls.
