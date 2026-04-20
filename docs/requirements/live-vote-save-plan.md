# Plan — Live (autosave) voting

Implements [live-vote-save.md](./live-vote-save.md).

## Scope

Replace the "Update vote" button with autosave. Introduce a single new POST route for vote mutations and rewrite [vote-form.tsx](../../app/polls/[id]/vote-form.tsx) to drive saves imperatively. Server mutation logic is extracted into a shared lib function so validation stays in one place.

## Files

**New**
- `lib/votes.ts` — pure mutation: `submitVoteForUser(userId, pollId, picks) → SubmitVoteResult`. No auth, no revalidation, no FormData. Direct port of the existing server action's body.
- `app/api/polls/[id]/vote/route.ts` — POST handler. `requireUser()`, parse JSON `{ picks: string[] }`, call `submitVoteForUser`, `revalidatePath('/polls/:id')` on success, return JSON.

**Modified**
- `app/polls/[id]/vote-form.tsx` — rewritten around an autosave state machine.

**Deleted**
- `app/polls/[id]/actions.ts` — `submitVote` was the only export and the only caller was `vote-form.tsx`. (Verified via grep: no other imports.)

## Route handler contract

```
POST /api/polls/:id/vote
Content-Type: application/json
Body: { "picks": string[] }
→ 200 { "ok": true,  "savedCount": number }
→ 200 { "ok": false, "error": string }
```

Returns 200 even on validation failure (matches the discriminated-union pattern already used elsewhere). 500-level responses only on unexpected exceptions. Proxy-auth note: `/api/*` bypasses the redirect middleware, but `requireUser()` uses `redirect('/login')` on missing session — in a route handler this surfaces as a 307, which is acceptable for a rarely-hit case (expired cookie mid-session).

## Vote form state machine

Local state:
- `picks: Set<string>` — current UI state.
- `savedPicks: Set<string>` — last confirmed-saved set (init from `initialPicks`).
- `status: 'idle' | 'saving' | 'saved' | 'error'` + `hasInteracted: boolean` → render blank label when `!hasInteracted`.
- `errorMessage: string | null`.

Refs:
- `debounceTimer` — handle for the pending save.
- `inFlight` — bool, true while a fetch is open.
- `pending` — bool, true if picks changed while inflight (coalesce signal).
- `retryScheduled` — bool, true during the single auto-retry window.

Flow:
1. `onCheckedChange` → update `picks`, set `hasInteracted`, `status='saving'`, reset debounce to 400 ms.
2. Debounce tick or explicit flush → call `save()`.
3. `save()`:
   - If `inFlight`, set `pending=true`, return.
   - `inFlight=true`, snapshot `picks`, POST to the route.
   - On `ok:true`: `savedPicks = snapshot`, `status='saved'`, `router.refresh()`.
   - On `ok:false`: `status='error'`, `errorMessage = result.error`. No retry (server-intentional rejection).
   - On network throw: if not yet retried, schedule retry in 1000 ms with the *current* picks; else `status='error'`, generic "Couldn't save" message.
   - Finally: `inFlight=false`. If `pending`, clear and call `save()` again.

Flush triggers (all call `save()` immediately, cancel the debounce):
- `visibilitychange` where `document.visibilityState === 'hidden'`.
- `pagehide`.
- Component unmount (`useEffect` cleanup) for in-app navigation.

For the unload path, `save()` uses `fetch(..., { keepalive: true })` and does not await — the browser keeps the request alive through teardown. For normal in-page saves, same endpoint, no `keepalive`, awaited for status updates.

UI updates:
- Remove `<form action>`, `useActionState`, the primary submit `Button`.
- Keep the `<Card>` / checkbox list. Wrap `onCheckedChange` with the state-machine hook.
- Add a secondary `Button variant="ghost"` labeled **Clear my picks**, only visible when `picks.size > 0`. Clicking empties `picks` and flushes immediately (no debounce).
- Footer row:
  - Left: existing `You picked N · each counts as 1/N credit` / `Pick at least one…` copy (unchanged).
  - Right: status indicator — small muted label. `Saving…`, `Saved`, `Couldn't save — <Retry>` (Retry is an inline button). Wrapped in `<span aria-live="polite">`.
- Keep the "How this works →" deep link.

## Open details (decide during coding)

- Debounce length: start at 400 ms. If Playwright shows excessive chatter while rapid-clicking, tune up.
- Saved-state fade animation: optional polish. Simple opacity / color transition on the label. Skip if it complicates a clean first pass.
- Clear-my-picks confirmation: *none*, per the design brief's no-native-dialog rule and because the action is recoverable (just re-check).

## Test plan

Type-check: `pnpm typecheck` passes.

Manual Playwright MCP:
1. Sign in (dev bypass), navigate to an open poll.
2. Check one restaurant → status transitions `Saving…` → `Saved` within ~1s. Verify `select * from votes where poll_id = ? and user_id = ?` reflects the pick.
3. Uncheck → status cycles; row deleted.
4. Rapid-click three boxes in under a second → only 1–2 saves observed in network tab; final DB state matches final UI.
5. Check a restaurant, then close the tab ~600 ms later. Reopen the poll page in a new tab. Pick persists.
6. Click **Clear my picks** → all boxes clear, rows deleted, `daily_participation` row for this template cleared.
7. Kill the route handler (force throw), toggle a box → `Couldn't save — Retry` surfaces after ~1s (one silent retry first). Restore the route, click Retry, save succeeds.
8. With the poll cancelled from `/admin/polls` in another tab, toggle a box → server rejects with a status error; UI reflects it.

No new automated tests: this project does not have a test framework wired up for UI (per [features.md](../features.md) / roadmap); DB + Playwright spot-checks are the bar.

## Rollback

- Delete `lib/votes.ts` and `app/api/polls/[id]/vote/route.ts`.
- Restore `app/polls/[id]/actions.ts` from git.
- Restore `app/polls/[id]/vote-form.tsx` from git.

All changes are local to the vote flow; no schema migrations, no changes to shared types, no effect on other features.
