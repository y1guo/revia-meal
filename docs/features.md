# Features and pages

All routes require login unless noted.

## Auth
- **`/login`** — Google sign-in. If the authenticated email is not in the `users` allowlist or is inactive, the user sees a "not authorized" screen and is signed out.

## Signed-in user pages
- **`/`** — dashboard. Shows today's active polls across all templates (one card per template running today). Each card shows current status and links to the poll page.
- **`/polls/:id`** — the dedicated page for a specific poll. Renders one of three views based on status:
  - **Not started** — template info, scheduled open time, restaurant list, and the user's current rolling credits for that template.
  - **Ongoing** — the voting UI. The user selects any subset of restaurants; live preview shows weight per pick as `(daily_credits + rolled_credits) / picks_count`.
  - **Ended** — results view. Shows winner, full ranking, per-restaurant tallies, and the diff of the user's credit balance after this poll.
- **`/history`** — list of past polls, filterable by template and date. Each row links to the poll's page.
- **`/credits`** — current user's rolling-credit balance in each template, plus a credit-event history.
- **`/settings`** — display name, manage API keys (create / revoke), sign out.

## Admin pages
- **`/admin/users`** — list, add, deactivate, change role, and delete allowlist entries.
- **`/admin/restaurants`** — CRUD on the restaurant catalog.
- **`/admin/templates`** — CRUD on poll templates: name, schedule, assigned restaurants (pulled from the catalog).
- **`/admin/polls`** (optional) — view scheduled / upcoming poll instances; re-instantiate manually if needed.

## Access control
- All non-auth routes require a valid session with `is_active = true`.
- `/admin/*` additionally require `role = admin`.
- Vote write path enforces: (a) the poll is currently `open`, and (b) the user has not already voted in a *different* template's poll for that `scheduled_date`.

## Poll instantiation

Polls are instantiated lazily by the server: whenever an active template has no poll row for today and something touches the day's data (dashboard load, history load, API poll-link fetch, etc.), the server creates the poll row. This keeps behavior correct without relying on an external scheduler.

There is no backfill for days the service was offline — the history reflects whatever was actually instantiated.
