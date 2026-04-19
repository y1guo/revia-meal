# Data model

Sketch of the Postgres tables. Exact types and indexes will be finalized in migrations.

## users

| column           | type          | notes                                                                                 |
|------------------|---------------|---------------------------------------------------------------------------------------|
| id               | uuid (pk)     | app-level id, generated at allowlist insert (NOT the Supabase auth id)                |
| email            | text (unique) | must be pre-provisioned by an admin to allow login                                    |
| display_name     | text          |                                                                                       |
| role             | text          | `user` or `admin`                                                                     |
| is_active        | bool          | lets admins disable access without deleting rows                                      |
| supabase_auth_id | uuid (unique) | nullable; populated on the user's first successful Google sign-in                     |
| created_at       | timestamptz   |                                                                                       |

Admins add a row here **before** someone can sign in (with `supabase_auth_id = NULL`). On each request we look up the row by the authenticated Google email; on first successful sign-in we also bind `supabase_auth_id` so downstream joins can use it stably. All foreign keys from other tables (`votes.user_id`, `api_keys.user_id`, etc.) reference `users.id`, not the Supabase auth id.

A sign-in is rejected if no matching row exists or `is_active = false`.

### Bootstrapping the first admin

Because admins are the only way new users get provisioned, the first admin can't come from the app itself. A one-shot **seed migration** reads an `INITIAL_ADMIN_EMAIL` environment variable and inserts a row with `role = admin`, `is_active = true`, on deploys where the `users` table is empty. On non-empty deploys the seed is a no-op. See [architecture.md](architecture.md) for the env var.

## restaurants

| column       | type          | notes                                     |
|--------------|---------------|-------------------------------------------|
| id           | uuid (pk)     |                                           |
| name         | text          |                                           |
| doordash_url | text          | optional                                  |
| notes        | text          | optional free text                        |
| is_active    | bool          | hide from future polls without deleting   |
| created_at   | timestamptz   |                                           |

Restaurants are defined once and reused across templates.

## poll_templates

A poll template is a recurring "lunch group": a configured set of restaurants, a schedule, and the home for that group's rolling-credit state.

| column      | type        | notes                                                  |
|-------------|-------------|--------------------------------------------------------|
| id          | uuid (pk)   |                                                        |
| name        | text        | e.g. "Regular", "Healthy food"                         |
| description | text        | optional                                               |
| schedule    | jsonb       | see shape below                                        |
| is_active   | bool        | pause a template without deleting                      |
| created_at  | timestamptz |                                                        |

`schedule` shape:

```json
{
  "days_of_week": [1, 2, 3, 4, 5],
  "opens_at_local": "10:00",
  "closes_at_local": "11:30",
  "timezone": "America/Los_Angeles"
}
```

`days_of_week` uses ISO numbering (1 = Monday ... 7 = Sunday). `opens_at_local` and `closes_at_local` are wall-clock times in `timezone`.

## template_restaurants

Many-to-many between templates and restaurants. Pure assignment — credit state lives on `votes` (see below).

| column        | type        | notes                                     |
|---------------|-------------|-------------------------------------------|
| template_id   | uuid (fk)   |                                           |
| restaurant_id | uuid (fk)   |                                           |
| is_active     | bool        | hide this option in future polls          |
| created_at    | timestamptz |                                           |

Primary key: `(template_id, restaurant_id)`.

Admin "remove a restaurant from this template" is a **soft deactivate** (`is_active = false`). The assignment row stays (so users keep their banked credits for that restaurant in this template), and re-activating restores the option to future ballots.

## polls

A concrete instance of a template for a given local date.

| column              | type                    | notes                                                   |
|---------------------|-------------------------|---------------------------------------------------------|
| id                  | uuid (pk)               |                                                         |
| template_id         | uuid (fk)               |                                                         |
| scheduled_date      | date                    | local date in the template's timezone                   |
| opens_at            | timestamptz             |                                                         |
| closes_at           | timestamptz             |                                                         |
| finalized_at        | timestamptz             | nullable; set when winner + credits computed            |
| cancelled_at        | timestamptz             | nullable                                                |
| cancellation_reason | text                    | nullable; `no_votes` or `admin`                         |
| cancelled_by        | uuid (fk → users)       | nullable; set when `cancellation_reason = 'admin'`      |
| winner_id           | uuid (fk → restaurants) | nullable                                                |
| created_at          | timestamptz             |                                                         |

Constraints:
- **Partial unique** index on `(template_id, scheduled_date) WHERE cancelled_at IS NULL` — makes lazy instantiation safe under concurrency while still allowing a new poll to be created for a date whose previous poll was cancelled.
- `CHECK (finalized_at IS NULL OR cancelled_at IS NULL)` — a poll cannot be both finalized and cancelled.

`opens_at` and `closes_at` are **materialized from the template's `schedule` at instantiation time** and are immutable on the poll row thereafter. If an admin edits the template's schedule, only **future** instantiations see the change — historical polls keep the timestamps they were created with. This is what keeps `/history` and `/polls/:id` faithful after a schedule change.

Each poll has its own dedicated URL (`/polls/:id`). Poll **status is derived**, not stored:
- `cancelled_at` set → **cancelled**
- `finalized_at` set → **closed**
- `now < opens_at` → **scheduled**
- `opens_at ≤ now < closes_at` → **open**
- `now ≥ closes_at` and neither finalized nor cancelled → **pending close** (any read triggers lazy finalization or auto-cancellation — see [polls.md](polls.md))

## poll_options

Snapshot of which restaurants were on offer in that specific poll. **Materialized at poll instantiation** from the template's currently-active restaurants and **frozen on the poll thereafter** — subsequent roster changes on the template do not alter the ballot of an already-instantiated poll.

| column        | type      | notes |
|---------------|-----------|-------|
| poll_id       | uuid (fk) |       |
| restaurant_id | uuid (fk) |       |

Primary key: `(poll_id, restaurant_id)`.

## votes

One row per user selection in a poll. **Doubles as the rolling-credit ledger** — a row that has not yet been "exercised" represents both a historical vote and a banked credit for that user/restaurant pair within the template. See [polls.md](polls.md#rolling-credits-per-user-per-restaurant) for the full algorithm.

| column             | type        | notes                                                                                       |
|--------------------|-------------|---------------------------------------------------------------------------------------------|
| poll_id            | uuid (fk)   |                                                                                             |
| user_id            | uuid (fk)   |                                                                                             |
| restaurant_id      | uuid (fk)   |                                                                                             |
| template_id        | uuid (fk)   | denormalized from `polls.template_id`; lets credit-tally queries skip a join                |
| scheduled_date     | date        | denormalized from the poll for daily-participation enforcement                              |
| vote_weight        | numeric     | the user's per-pick weight at submit time, `1 / picks_count`. Set on insert, never updated  |
| created_at         | timestamptz |                                                                                             |
| exercised_at       | timestamptz | nullable; set when this credit is consumed (the row's restaurant won a poll the user voted in) |
| exercised_poll_id  | uuid (fk)   | nullable; the poll that consumed it. CHECK: `(exercised_at IS NULL) = (exercised_poll_id IS NULL)` |

Primary key: `(poll_id, user_id, restaurant_id)`. Users edit picks during the open window via DELETE+INSERT; the new row's `vote_weight` reflects the new split.

A row can be in two states:

- **Unexercised** (`exercised_at IS NULL`): counts as both a historical vote and as banked credit for `(user, template, restaurant)`. The row's `vote_weight` is the credit's value.
- **Exercised** (`exercised_at` set): purely historical. No longer contributes to any future tally.

## daily_participation

Locks a user to one template's poll per local date. Written on the user's first vote of the day; used to reject subsequent votes for any other template's poll on the same `scheduled_date`.

| column         | type        | notes |
|----------------|-------------|-------|
| user_id        | uuid (fk)   |       |
| scheduled_date | date        |       |
| template_id    | uuid (fk)   |       |
| first_voted_at | timestamptz |       |

Primary key: `(user_id, scheduled_date)`.

The lock is **sticky** — unpicking every restaurant does not release it. If that turns out to be annoying in practice we can relax the rule later.

## api_keys

Each user (including admins) can generate their own API keys.

| column       | type        | notes                |
|--------------|-------------|----------------------|
| id           | uuid (pk)   |                      |
| user_id      | uuid (fk)   |                      |
| name         | text        | human label          |
| token_hash   | text        | we store only a hash |
| last_used_at | timestamptz | nullable             |
| revoked_at   | timestamptz | nullable             |
| created_at   | timestamptz |                      |

API requests send `Authorization: Bearer <token>`. Permissions follow the owning user's **current** `role` — see [roadmap.md](roadmap.md) for known implications.
