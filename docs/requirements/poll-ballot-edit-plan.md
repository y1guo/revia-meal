# Plan — Admin edit of an open poll's ballot

Implements [poll-ballot-edit.md](./poll-ballot-edit.md).

## Changes

**New**
- `db/migrations/0004_poll_options_disabled_at.sql` — add one nullable column.
- `app/admin/polls/edit-ballot-modal.tsx` — the admin modal.

**Modified**
- `lib/polls.ts` — add `editPollBallot()`; update `finalizePoll` to ignore disabled options and emit a new `no_available_restaurants` cancellation reason.
- `lib/votes.ts` — enforce "disabled options cannot be newly picked" as a server-side guard.
- `app/admin/polls/actions.ts` — add `editBallotAction(formData)` gated by `requireAdmin`.
- `app/admin/polls/page.tsx` — enrich the row type for scheduled/open polls with their current ballot (both active and disabled entries), and include the catalog list so the modal can show "not-on-ballot" candidates.
- `app/admin/polls/polls-table.tsx` — new "Edit ballot…" row action for scheduled/open polls; wire the modal.
- `app/polls/[id]/page.tsx` — include `disabled_at` when fetching poll_options; pass a `disabled` flag down to `VoteForm`.
- `app/polls/[id]/vote-form.tsx` — render disabled rows per the spec (muted + chip; allow unvote if previously picked, block new picks).
- `app/api/v1/polls/[id]/results/route.ts` — include disabled options in the ballot with the `disabled` flag so integrators can reflect the same state.

## Migration

```sql
-- 0004_poll_options_disabled_at.sql
alter table poll_options
    add column disabled_at timestamptz;
```

Single nullable column. Existing rows default to `null` = active. No data backfill needed; no constraints to add.

## Lib changes

### `lib/polls.ts` — `editPollBallot`

Body sequence:
1. Fetch poll: `id, finalized_at, cancelled_at, opens_at, closes_at`. Derive status via `getPollStatus`. Reject if not `scheduled` or `open`.
2. Dedup `added` and `removed` arrays; drop overlaps (if an id appears in both, treat it as a no-op on that id).
3. Validate every id is a real, `is_active=true` restaurant. Reject otherwise.
4. Load current `poll_options` rows for the poll. Compute post-edit active count:
   - existing active + added − removed
   - reject with "Can't disable the entire ballot…" if the post-edit count is 0.
5. `upsert` added ids with `disabled_at = null` (`onConflict: 'poll_id,restaurant_id'`).
6. `update` removed ids to `disabled_at = now()`, scoped to `poll_id`. (If the row doesn't exist, nothing happens — consistent.)
7. Return `{ status: 'ok' }`; `{ status: 'noop' }` if step 2 left both lists empty.

### `lib/polls.ts` — `finalizePoll` changes

- Change the `poll_options` fetch to `.is('disabled_at', null)` — disabled options no longer compete.
- If the filtered ballot is empty AND there are zero votes on active options: auto-cancel with `cancellation_reason: 'no_available_restaurants'` (parallel to the existing `'no_votes'` branch). Technically the two conditions can overlap; prefer `'no_available_restaurants'` when active ballot is empty regardless of vote count, since that's the more specific reason.
- Everything else (winner pick, exercise step) works unchanged because it iterates the filtered tallies.

### `lib/votes.ts` — server-side guard

Inside `submitVoteForUser`, the existing ballot validation selects `poll_options.restaurant_id`. Extend it to `poll_options.restaurant_id, disabled_at` and build `allowed` as only the active ones. Reject picks that include a disabled option with a clear error — the UI prevents this, so the error is a failsafe.

Note: existing votes for a now-disabled option are not pruned; they already exist in the `votes` table. Submitting a *new* set that includes the disabled option is blocked.

## Admin page

Enrich the SELECT alongside the gap #2 enrichment:

```ts
// In the existing page.tsx batch:
const editableStatuses = new Set<PollStatus>(['scheduled', 'open'])
const editablePollIds = pagePolls
    .filter((p) => editableStatuses.has(getPollStatus(p)))
    .map((p) => p.id as string)
```

Fetch `poll_options.poll_id, restaurant_id, disabled_at` for these ids (parallel with the existing ballot fetch for closed polls). Build `ballotByPoll` into a shape that carries both active + disabled entries.

`PollTableRow` gains:
- `editableBallot: { id: string; name: string; disabled: boolean }[] | null` — active and disabled entries, for scheduled/open polls. `null` otherwise.
- (existing `ballot` for closed polls — kept as-is; only `{id, name}`.)

Also pass the full restaurant catalog (`{ id, name, is_active }`) down to the table so the modal can show the "not on ballot" candidates. Filter to `is_active=true` before passing.

## Admin modal (`edit-ballot-modal.tsx`)

Two-column layout inside the Modal primitives:

- **Left**: "On the ballot" — list of current entries (both active and disabled). Checkbox toggles removal. Disabled entries render with a "Removed" chip; the checkbox default is unchecked (indicating they're *removed from the active set*).
- **Right**: "Available to add" — list of active catalog restaurants not currently active on the ballot. Checkbox toggles addition. Previously-disabled entries show a "Previously on this poll — will reactivate" hint.
- **Footer**: diff summary `+N added, M removed`; disabled save button if diff is empty.
- Primary button `Save changes`; destructive-leaning tone because removing votes' visibility is meaningful but not destructive of data.

On submit: collect the `added` (ids checked on the right) and `removed` (ids *unchecked* on the left's active ones) sets, POST to `editBallotAction`, close on success, leave open with inline error on failure.

## Voter form (`vote-form.tsx`)

Extend `Ballot` type:

```ts
export type Ballot = {
    id: string
    name: string
    notes: string | null
    doordash_url: string | null
    disabled: boolean  // new
}
```

For each row:
- Compute `wasPicked = initialPicks.includes(r.id)`.
- If `r.disabled`:
  - If the user has it as a current pick: render with muted color, a "Removed" chip, and an enabled checkbox whose behavior is "unvote only":
    - Checking is blocked (handled by `togglePick` no-op when `disabled && !picks.has(r.id)` — already the case post-unvote).
    - Once unchecked, the local `picks` no longer has the id; the row renders as fully disabled (`checked={false}, disabled={true}`).
  - If the user didn't pick it: render fully disabled (`disabled={true}, checked={false}`). Still shows the "Removed" chip.

Autosave path is unchanged. The `Ballot.disabled` is a render hint; the server ballot validation is what enforces the rule.

## Poll page data flow

In [app/polls/[id]/page.tsx](../../app/polls/[id]/page.tsx) where the ballot currently loads from `poll_options`:

```ts
admin.from('poll_options').select('restaurant_id, disabled_at').eq('poll_id', id)
```

Pass `disabled: o.disabled_at !== null` down into the `restaurants` array used by `VoteForm`. Keep the existing sort by name, but order disabled entries *after* active ones (subtle visual grouping; design brief welcomes small clarity wins).

For the closed view (`ClosedBreakdown`): no change needed. Tally snapshot already captures everything; disabled restaurants with votes still appear in the per-restaurant breakdown. The winner card follows `winner_id` as before.

## API route

`/api/v1/polls/:id/results` — extend ballot shape with `disabled: boolean`. Explicitly document in [docs/api.md](../api.md) that disabled options may appear in the ballot and should be rendered accordingly by integrators (they will also see them with a zero today-votes tally if nobody voted, or a non-zero tally if somebody had voted before removal).

## Test plan

**Type-check + lint** as usual.

**Playwright MCP flow:**

1. Pick the currently-open Healthy Club poll as admin. Toggle a pick as Alice to seed a vote.
2. Sign in as admin, `/admin/polls → Edit ballot` on that open poll. Remove Banh Mi Saigon (that Alice voted for) and add a currently-unassigned restaurant from the catalog.
3. On `/polls/:id` as Alice:
   - Banh Mi Saigon is shown greyed with "Removed" chip AND her check mark is still visible.
   - She can uncheck it (autosave fires); after uncheck, she can't re-check it.
   - The newly-added restaurant is clickable.
4. Close the poll (wait or shift-poll script). Finalization should pick a winner from the active options only; Banh Mi Saigon's votes feed the credit-bank accrual for it but don't compete for the win.
5. **All-disabled case**: on a seeded poll, remove every restaurant via two or three Edit-ballot passes (server should block the final "all disabled" edit per the safeguard). To exercise auto-cancel, I'll script: directly `update poll_options set disabled_at = now()` for all rows on a specific test poll (bypasses our safeguard), then close the poll — verify auto-cancel with `no_available_restaurants`.
6. **API check**: hit `/api/v1/polls/:id/results` with the admin key; verify ballot entries carry the `disabled` flag.

## Rollback

- Revert the code changes.
- Drop the `disabled_at` column: `alter table poll_options drop column disabled_at;` (data loss: the soft-disabled state is gone, options revert to active).
- Any `votes` rows for previously-disabled options stay fine — no FK change.

## Out of scope

- Notifying voters of admin edits.
- Audit log of who edited which ballot.
- Edit-ballot on finalized polls (the override-winner flow covers that case differently).
