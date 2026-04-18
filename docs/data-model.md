# Data model

Sketch of the Postgres tables. Exact types and indexes will be finalized in migrations.

## users

| column       | type          | notes                                               |
|--------------|---------------|-----------------------------------------------------|
| id           | uuid (pk)     | matches Supabase auth user id                       |
| email        | text (unique) | must be pre-provisioned by an admin to allow login  |
| display_name | text          |                                                     |
| role         | text          | `user` or `admin`                                   |
| is_active    | bool          | lets admins disable access without deleting rows    |
| created_at   | timestamptz   |                                                     |

Admins add a row here **before** someone can sign in. The login flow verifies that the Google email is present and active; anything else is rejected.

## restaurants

| column        | type          | notes                                     |
|---------------|---------------|-------------------------------------------|
| id            | uuid (pk)     |                                           |
| name          | text          |                                           |
| doordash_url  | text          | optional                                  |
| notes         | text          | optional free text                        |
| is_active     | bool          | hide from future polls without deleting   |
| created_at    | timestamptz   |                                           |

Restaurants are defined once and reused across templates.

## poll_templates

A poll template is a recurring "lunch group": a configured set of restaurants, a schedule, and the home for that group's rolling-credit state.

| column      | type        | notes                                                  |
|-------------|-------------|--------------------------------------------------------|
| id          | uuid (pk)   |                                                        |
| name        | text        | e.g. "Regular", "Healthy food"                         |
| description | text        | optional                                               |
| schedule    | jsonb       | days of week, open time, close time, timezone          |
| is_active   | bool        | pause a template without deleting                      |
| created_at  | timestamptz |                                                        |

## template_restaurants

Join table — many-to-many between templates and restaurants.

| column        | type      | notes                             |
|---------------|-----------|-----------------------------------|
| template_id   | uuid (fk) |                                   |
| restaurant_id | uuid (fk) |                                   |
| is_active     | bool      | hide this option in future polls  |

Primary key: `(template_id, restaurant_id)`.

## polls

A concrete instance of a template on a given day.

| column         | type                        | notes                                |
|----------------|-----------------------------|--------------------------------------|
| id             | uuid (pk)                   |                                      |
| template_id    | uuid (fk)                   |                                      |
| scheduled_date | date                        | the day this poll belongs to         |
| opens_at       | timestamptz                 |                                      |
| closes_at      | timestamptz                 |                                      |
| status         | text                        | `scheduled` / `open` / `closed`      |
| winner_id      | uuid (fk → restaurants)     | null until closed                    |
| created_at     | timestamptz                 |                                      |

Each poll has its own dedicated URL (`/polls/:id`), which renders the view appropriate to the poll's current status.

## poll_options

Snapshot of which restaurants were in play for that specific poll. Lets templates change their roster without rewriting history.

| column        | type      | notes |
|---------------|-----------|-------|
| poll_id       | uuid (fk) |       |
| restaurant_id | uuid (fk) |       |

Primary key: `(poll_id, restaurant_id)`.

## votes

One row per (user, poll, restaurant) pick.

| column        | type        | notes                                   |
|---------------|-------------|-----------------------------------------|
| poll_id       | uuid (fk)   |                                         |
| user_id       | uuid (fk)   |                                         |
| restaurant_id | uuid (fk)   |                                         |
| weight        | numeric     | credit amount allocated to this pick    |
| created_at    | timestamptz |                                         |

Primary key: `(poll_id, user_id, restaurant_id)`.

A user can only cast votes in **one** poll per `scheduled_date`, enforced in the write path.

## credits

Rolling credit balance per user per template.

| column      | type        | notes                   |
|-------------|-------------|-------------------------|
| user_id     | uuid (fk)   |                         |
| template_id | uuid (fk)   |                         |
| balance     | numeric     | accumulated rollover    |
| updated_at  | timestamptz |                         |

Primary key: `(user_id, template_id)`.

How balances move on poll open/close is governed by the rolling-credit policy — **TBD**, see [polls.md](polls.md).

## credit_events

Append-only audit of every credit movement. Useful both for debugging the policy and for the user-facing "where did my credits go" view.

| column      | type        | notes                                    |
|-------------|-------------|------------------------------------------|
| id          | uuid (pk)   |                                          |
| user_id     | uuid (fk)   |                                          |
| template_id | uuid (fk)   |                                          |
| poll_id     | uuid (fk)   | nullable — e.g. for daily grants         |
| delta       | numeric     | positive or negative                     |
| reason      | text        | `daily_grant`, `spent`, `refund`, ...    |
| created_at  | timestamptz |                                          |

## api_keys

Each user (including admins) can generate their own API keys.

| column       | type        | notes                    |
|--------------|-------------|--------------------------|
| id           | uuid (pk)   |                          |
| user_id      | uuid (fk)   |                          |
| name         | text        | human label              |
| token_hash   | text        | we store only a hash     |
| last_used_at | timestamptz | nullable                 |
| revoked_at   | timestamptz | nullable                 |
| created_at   | timestamptz |                          |

API requests send `Authorization: Bearer <token>`. Permissions follow the owning user's `role`: admin keys can call admin endpoints, regular user keys cannot.
