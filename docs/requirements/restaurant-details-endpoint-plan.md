# Plan — Restaurant-by-ID API endpoint

Implements [restaurant-details-endpoint.md](./restaurant-details-endpoint.md).

## Changes

**New**
- `app/api/v1/restaurants/[id]/route.ts` — the GET handler.

**Modified**
- `docs/api.md` — add a row under the existing endpoint list.

No schema changes, no library work, no UI. Purely additive.

## Handler

Mirror the existing `/api/v1/polls/[id]/results/route.ts` pattern for consistency:

1. `authenticateApiRequest(request)` — returns user or sends 401/403.
2. `await ctx.params` to get the id.
3. `admin.from('restaurants').select('id, name, notes, doordash_url, is_active').eq('id', id).maybeSingle()` — one round-trip.
4. If no row, return `Response.json({ error: 'Restaurant not found.' }, { status: 404 })`.
5. Build the response: always include `id, name, notes, doordash_url`. Include `is_active` only when `auth.user.role === 'admin'`.
6. `return Response.json({ restaurant })`.

## Docs update

Add under `## MVP endpoints` → `### User` in [docs/api.md](../api.md):

- **`GET /api/v1/restaurants/:id`**
  Returns a single restaurant's public fields: `id`, `name`, `notes`, `doordash_url`. Admin keys additionally receive `is_active`. 404 if the id is unknown. Intended for integrations that already know a restaurant id (e.g. from a poll result's `winner_id`) and want the DoorDash link without fetching the full poll.

Also nudge the "None in MVP" note under `### User` — that's no longer true.

## Test plan

**Type-check + lint:** `pnpm exec tsc --noEmit` on the new file; lint the new file.

**Manual curl (dev server already running):**

1. Mint an API key via the web UI: sign in as admin (`Yi Guo (Personal)(admin)`), go to `/settings`, create a key, copy the plaintext.
2. Hit `curl -s -H "Authorization: Bearer <key>" http://localhost:3000/api/v1/restaurants/<id>` for a known restaurant id — expect full JSON including `is_active`.
3. Hit it with a non-admin user's key (create one as Alice) — expect the JSON minus `is_active`.
4. Hit it with a bogus id — expect 404.
5. Hit it with no Authorization header — expect 401.
6. Hit it with a revoked key — expect 401 ("Invalid API key.").

Skip automated tests (project convention — see [features.md](../features.md)).

## Rollback

Delete the new route file and the docs section. Nothing else touches this change.
