# Roadmap and open questions

## MVP scope (what we're building first)

- Google login restricted to the admin-provisioned allowlist.
- Restaurant catalog CRUD.
- Poll template CRUD (name, schedule, restaurant set).
- Lazy daily poll instantiation from active templates.
- Dedicated per-poll URL with scheduled / open / closed / cancelled views.
- Voting: one credit per poll, one template per user per local date, freely editable during the open window.
- Rolling accumulated credits per `(template, restaurant)` with a **placeholder policy** (see below).
- Lazy finalization at `closes_at` — winner + credit updates in one transaction, or auto-cancel if no votes.
- Admin poll cancellation from `/admin/polls`.
- History page, leaderboard page, user settings with per-user API keys.
- Admin API endpoints: "get today's poll links", "get poll results".

## Deferred algorithm questions

The rolling-credit policy is intentionally not finalized. Under the restaurant-owned credit model, the open questions reduce to:

- **Winner reduction size.** Current placeholder: full reset to 0. Alternatives: subtract the second-place total, subtract the winning margin, subtract a fixed amount.
- **Decay.** Whether accumulated balances should decay over time to prevent long-dormant options from eventually dominating.
- **Tiebreaker.** Current placeholder: uniform random among tied restaurants. A more structured rule (e.g. history-aware) can be designed in the same session if desired.

## Known limitations accepted for MVP

- **API keys inherit the owning user's current role.** Promoting a user to admin silently grants their existing keys admin scope; demoting does the reverse. Acceptable for an internal team of ~15 — revisit if we add finer-grained scopes or external integrations.
- **Session / API-key invalidation on deactivation is not forced.** `is_active` is checked on each DB-touching request, so a deactivated user stops working on their next call, but we do not forcibly invalidate an in-flight Supabase auth session or an in-flight SSR render. Acceptable given the trust boundary is the office.

## Explicitly out of scope for MVP

- **DoorDash automation.** For MVP we just surface the winner. Creating the group order stays manual.
- **Voting via API.** Users can generate keys, but regular-user endpoints are not built in MVP.
- **Notifications from inside the app.** The Slack cron is external and pulls through the API.

## Future / later

- Supabase RLS once role separation matters beyond the current small team.
- Stats dashboards (per-restaurant, per-user) beyond the leaderboard and history views.
- Receipt / photo uploads via Supabase Storage.
- Multi-office / multi-team support — today the app assumes one office.
- Admin "re-instantiate" action for a cancelled poll.
- A "dry run" view for admins to simulate how a proposed credit-policy change would have affected historical polls.
