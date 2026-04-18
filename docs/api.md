# External API

A small HTTP API for external automation (the Slack cron, and future integrations). All endpoints live under `/api/v1/*`.

## Authentication

Every request must include:

```
Authorization: Bearer <api_key>
```

API keys are **per user**. Any signed-in user can generate and revoke their own keys from `/settings`. A key inherits the owning user's role:

- An admin's key can call admin endpoints.
- A regular user's key can only call user endpoints.

We store only a hash of the token; the plaintext is shown **once** at creation time. Revoked or missing keys return `401`.

## MVP endpoints

### Admin

- **`GET /api/v1/polls/today`**
  Returns a list of today's scheduled polls — one entry per template active today. Each entry includes the poll id, absolute URL to the poll page, and current status. Intended for the Slack cron to fetch "which links do I post this morning?". If the day's polls have not yet been instantiated, this call triggers instantiation as a side effect.

- **`GET /api/v1/polls/:id/results`**
  Returns the poll's final state: winner, per-restaurant tallies, participation stats. Returns a clear `in_progress` shape if the poll has not yet closed.

### User

None in MVP. Voting via API is intentionally out of scope — see [roadmap.md](roadmap.md).

## Errors

Errors return JSON of shape `{ "error": "<code>", "message": "<human>" }` with standard HTTP status codes (`401` auth, `403` role, `404` not found, `409` state conflict, `422` validation).
