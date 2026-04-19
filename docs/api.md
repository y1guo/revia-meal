# External API

A small HTTP API for external automation (the Slack cron, future integrations). All endpoints live under `/api/v1/*`.

## Authentication

Every request must include:

```
Authorization: Bearer <api_key>
```

API keys are **per user**. Any signed-in user can generate and revoke their own keys from `/settings`. A key inherits the owning user's **current** role:

- An admin's key can call admin endpoints.
- A regular user's key can only call user endpoints.

We store only a hash of the token; the plaintext is shown **once** at creation time. Revoked or missing keys return `401`. If a user is deactivated, their keys are treated as revoked on the next request — see [roadmap.md](roadmap.md) for the known gap where an in-flight session is not forcibly invalidated.

## MVP endpoints

### Admin

- **`GET /api/v1/polls/today`**
  Returns a list of today's scheduled polls — one entry per active template running today — each with the poll id, absolute URL, and current status. Hitting this endpoint **lazily instantiates** the day's poll rows if they don't yet exist. Intended for the Slack cron: "which links do I post this morning?".

- **`GET /api/v1/polls/:id/results`**
  Returns the poll's current state. Hitting this endpoint after `closes_at` triggers **lazy finalization** (compute winner + credit movements, or auto-cancel if no votes). Response shape:
  - `in_progress` — poll has not closed yet.
  - `closed` — winner, per-restaurant breakdown (today's votes + banked-credit boost = total tally), and the list of voters per restaurant.
  - `cancelled` — cancellation reason (`no_votes` or `admin`) and, if admin, who cancelled.

### User

None in MVP. Voting via API is intentionally out of scope — see [roadmap.md](roadmap.md).

## Errors

Errors return JSON of shape `{ "error": "<code>", "message": "<human>" }` with standard HTTP status codes (`401` auth, `403` role, `404` not found, `409` state conflict, `422` validation).
