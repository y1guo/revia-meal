# Requirements — Restaurant-by-ID API endpoint

Admins need a direct way to look up a restaurant's DoorDash link (and later, richer details) given only its id — so a Slack integration or script can turn a poll's `winner_id` into "here's the link to start the group order". Today the link is embedded in the ballot on `/api/v1/polls/:id/results`, which forces integrators to fetch a whole poll to pick out one restaurant field.

## Goals

- `GET /api/v1/restaurants/:id` returning the restaurant's public fields (id, name, notes, doordash_url).
- Bearer-token auth, matching the rest of `/api/v1/*`.
- Return `is_active` additionally when the caller's key belongs to an admin — matches the web-UI scoping.
- Clean, forward-compatible response shape: as we add columns to `restaurants` in a future gap (hours, description, cover image, etc.), this endpoint grows without breaking existing integrators.

## Non-goals

- No list endpoint (`GET /api/v1/restaurants`). The user specifically asked for by-id lookup; a list is YAGNI until a consumer needs it.
- No write endpoints. Restaurant mutations stay behind the web admin.
- No inclusion of banked-credit stats or per-template associations. Those belong to other endpoints.
- No changes to `/api/v1/polls/:id/results` — it already embeds `doordash_url` per ballot row and that's fine to keep for callers that want everything in one round-trip.

## Behavior

- `GET /api/v1/restaurants/:id` with `Authorization: Bearer <key>`.
- 401 on missing / malformed / revoked key, 403 on inactive user (reuses `authenticateApiRequest`).
- 404 if the restaurant doesn't exist.
- 200 with JSON:

  ```json
  {
    "restaurant": {
      "id": "…",
      "name": "Banh Mi Saigon",
      "notes": "Pork belly is the move",
      "doordash_url": "https://www.doordash.com/…",
      "is_active": true        // admin-only; omitted for non-admin keys
    }
  }
  ```

- Inactive restaurants are still returned (admins may need to look them up after soft-delete). Non-admin callers just don't see the `is_active` field.

## Success criteria

- `curl -H "Authorization: Bearer <admin-key>" …/api/v1/restaurants/<id>` returns the expected JSON with `is_active`.
- Same `curl` with a non-admin user's key returns the same JSON minus `is_active`.
- Unknown id returns 404 with `{ "error": "Restaurant not found." }`.
- Missing / bad Authorization header returns 401 with existing error shapes.
- [docs/api.md](../api.md) has a new entry under "User" (available to all) describing the endpoint.
