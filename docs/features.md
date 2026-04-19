# Features and pages

All routes require login unless noted.

## Auth
- **`/login`** — Google sign-in. If the authenticated email is not in the `users` allowlist or is inactive, the user sees a "not authorized" screen and is signed out.

## Signed-in user pages
- **`/`** — dashboard. Shows today's polls across all active templates (one card per template running today), each in its current state.
- **`/polls/:id`** — the dedicated page for a specific poll. Renders one of four views based on derived status:
  - **Scheduled** — template info, scheduled open time, restaurant list.
  - **Open** — voting UI. The user adds and removes picks freely; the live preview shows the per-pick weight as `1 / picks_count`. Each option also displays the user's own banked credit for that restaurant in this template (e.g. `+0.5 banked`) — see [polls.md](polls.md#visibility-rules) for the visibility rules. The aggregate live tally is hidden during the open window. If the user has already participated in another template's poll for this `scheduled_date`, the voting UI is disabled with a clear message pointing at the other poll.
  - **Closed** — results view. Winner, full per-restaurant breakdown (today's votes + banked-credit boost = total tally), and the who-voted-what list.
  - **Cancelled** — clearly labeled, with the reason (`no_votes`, or `admin` with the cancelling user shown).
- **`/history`** — list of past polls (both closed and cancelled), filterable by template and date. Each row links to the poll's page.
- **`/people`** — per-user "favorite restaurants spectrum": each user's vote counts aggregated by restaurant over a configurable date range. Read-only, accessible to all signed-in users.
- **`/settings`** — display name, manage API keys (create / revoke), sign out.

## Admin pages
- **`/admin/users`** — list, add, deactivate, change role, delete allowlist entries.
- **`/admin/restaurants`** — CRUD on the restaurant catalog.
- **`/admin/templates`** — CRUD on poll templates: name, schedule, assigned restaurants (pulled from the catalog).
- **`/admin/polls`** — list upcoming and recent poll instances. Supports **cancel** on any poll in `scheduled` or `open` state (records `cancelled_by`).

## Access control
- All non-auth routes require a valid session for a user that is currently `is_active = true`.
- `/admin/*` additionally require `role = admin`.
- Vote write path enforces: (a) the poll is currently `open`, and (b) the user's `daily_participation` row for this `scheduled_date`, if one exists, points to this poll's template.

## Poll lifecycle (summary)

See [polls.md](polls.md) for the full spec. In short:

- **Lazy instantiation.** Any request that needs "today's poll" for an active template creates the row if no poll (cancelled or otherwise) exists yet for that date. The partial unique index on `(template_id, scheduled_date) WHERE cancelled_at IS NULL` makes concurrent creates safe. Cancelled polls are **not** auto-resurrected.
- **Lazy finalization.** The first request to touch a poll after `closes_at` either finalizes it (winner + credit movements in one transaction) or auto-cancels it if there are no votes.
- **Cancellation.** Admins can cancel any `scheduled` or `open` poll from `/admin/polls`. Cancelled polls move no credits.
- **No backfill** for days the service was offline.
