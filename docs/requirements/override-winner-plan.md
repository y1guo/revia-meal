# Plan — Manual override of poll winner

Implements [override-winner.md](./override-winner.md).

## Changes

**New**
- `db/migrations/0003_poll_overrides.sql` — the audit table + index.
- `app/polls/[id]/override-banner.tsx` — voter-facing banner + history disclosure.
- `app/admin/polls/override-winner-modal.tsx` — admin modal for selecting a new winner and reason.

**Modified**
- `lib/polls.ts` — add `overridePollWinner()` alongside `cancelPoll()`. Same style: discriminated-union result, race-tolerant UPDATE, idempotent exercise step.
- `app/admin/polls/actions.ts` — add `overridePollAction(formData)` server action gated by `requireAdmin()`.
- `app/admin/polls/page.tsx` — extend the select to pull ballot + current winner id for *closed* polls; enrich `PollTableRow`.
- `app/admin/polls/polls-table.tsx` — add the "Override winner…" row action and wire the modal.
- `app/polls/[id]/page.tsx` — fetch `poll_overrides` for closed polls, render `OverrideBanner` above `ClosedBreakdown`.

**Types touched**
- `PollTableRow` gains `winnerId: string | null` and `ballot: { id: string; name: string }[] | null` (populated only when `status === 'closed'`).
- `OverrideResult` (lib): discriminated union parallel to `CancelResult`.

## Migration

```sql
-- 0003_poll_overrides.sql
create table poll_overrides (
    id             uuid primary key default gen_random_uuid(),
    poll_id        uuid not null references polls(id) on delete cascade,
    overridden_at  timestamptz not null default now(),
    overridden_by  uuid references users(id) on delete set null,
    old_winner_id  uuid not null references restaurants(id) on delete restrict,
    new_winner_id  uuid not null references restaurants(id) on delete restrict,
    reason         text
);
create index poll_overrides_poll_idx on poll_overrides (poll_id, overridden_at desc);
```

`overridden_by` uses `set null` to match `polls.cancelled_by`'s precedent. Reason is `text` (no length cap at DB level; enforce ≤200 chars client-side).

## Lib function

```ts
// lib/polls.ts
export type OverrideResult =
    | { status: 'ok' }
    | { status: 'noop'; reason: 'same-winner' }
    | { status: 'error'; error: string }

export async function overridePollWinner(args: {
    adminUserId: string
    pollId: string
    newWinnerId: string
    reason: string | null
}): Promise<OverrideResult>
```

Body sequence (same admin client we use elsewhere):

1. **Fetch the poll** — need `template_id`, `scheduled_date`, `finalized_at`, `cancelled_at`, `winner_id`. Reject unless `finalized_at IS NOT NULL && cancelled_at IS NULL`.
2. **Sanity-check the new winner** — query `poll_options` for `(poll_id = <poll>, restaurant_id = <new>)`. Reject if not on the ballot.
3. **Same-winner guard** — if `winner_id === newWinnerId`, return `{status:'noop', reason:'same-winner'}`. The action can still record an audit row with reason-only if we want "note added" semantics, but MVP: no-op cleanly.
4. **Un-exercise the current winner's rows:** `UPDATE votes SET exercised_at=null, exercised_poll_id=null WHERE exercised_poll_id = <pollId>`. (Idempotent: if somehow already un-exercised, affects zero rows.)
5. **Claim the winner update atomically:** `UPDATE polls SET winner_id=<new> WHERE id=<poll> AND finalized_at IS NOT NULL AND cancelled_at IS NULL RETURNING id`. If zero rows returned, return `{status:'error', error:'Poll is no longer finalized.'}` — a cancel landed between steps. The un-exercise from step 4 is already committed; we don't roll it back because the poll is now cancelled and `cancelPoll` would have un-exercised anyway.
6. **Re-exercise new-winner rows for this poll's voters:** figure out today's voters from `votes WHERE poll_id = <poll>` (distinct `user_id`). Then `UPDATE votes SET exercised_at=now(), exercised_poll_id=<pollId> WHERE template_id=<poll.template_id> AND restaurant_id=<new> AND user_id IN (<voters>) AND exercised_at IS NULL`. This mirrors the exercise step in `finalizePoll`.
7. **Insert audit row** — `poll_overrides(poll_id, overridden_by, old_winner_id, new_winner_id, reason)`.
8. Return `{ status: 'ok' }`.

Concurrency posture matches the existing memo ("Acceptable for a 15-person internal app"). No SQL function / FOR UPDATE. Two concurrent overrides both proceed; last write to `winner_id` wins, both audit rows persist.

## Server action

```ts
// app/admin/polls/actions.ts
export async function overridePollAction(formData: FormData) {
    const admin = await requireAdmin()
    const pollId = String(formData.get('poll_id') ?? '')
    const newWinnerId = String(formData.get('new_winner_id') ?? '')
    const rawReason = String(formData.get('reason') ?? '').trim()
    const reason = rawReason ? rawReason.slice(0, 200) : null
    if (!pollId || !newWinnerId) throw new Error('Missing required fields.')
    const result = await overridePollWinner({
        adminUserId: admin.id,
        pollId,
        newWinnerId,
        reason,
    })
    if (result.status === 'error') throw new Error(result.error)
    revalidatePath('/admin/polls')
    revalidatePath(`/polls/${pollId}`)
    return result
}
```

Throwing on error keeps client parity with `cancelPollAction`. Client wraps the call in a try/catch and surfaces.

## Admin polls page (SELECT enrichment)

Current query returns rows without ballot. Enrich only for closed polls: run a second query for `poll_options` + restaurant names filtered to the page's closed poll ids, build a `Map<pollId, Ballot[]>`, merge into rows. Don't over-eager-load for non-closed rows.

Add `winnerId` (from `poll.winner_id`) to the row type unconditionally — null unless the poll is closed.

## Modal component

`OverrideWinnerModal` — custom component using the existing `Modal` primitives (`Modal`, `ModalIcon`, `ModalTitle`, `ModalTargetChip`, `ModalBody`, `ModalWarning`, `ModalFooter`, `ModalClose`). Similar visual language to `DestructiveConfirmModal` but with fields:

- `ModalIcon` tone="destructive", `AlertTriangle`.
- `ModalTitle`: "Override poll winner?"
- `ModalTargetChip`: `<template name> — <date>`
- `ModalBody`:
  - Muted line: "Current winner: <name>".
  - `Select` with the ballot minus the current winner; placeholder "Pick a new winner".
  - `Textarea` labeled "Reason (optional)" with `maxLength={200}` and helper text.
  - Paragraph explaining credit-bank consequences (dry, ≤2 sentences).
- `ModalWarning`: "Credits exercised on the current winner will return to voters; credits for the new winner will be exercised. Undo by overriding again."
- `ModalFooter`: Cancel + destructive primary "Override winner". Primary disabled until a new winner is chosen. Busy state via `loading` prop on the button.

Error surface: on thrown server-action error, display an inline `Callout` tone="danger" inside the modal body above the footer. Keep the modal open on error so user can retry.

## Voter-facing banner

`OverrideBanner` client component (or server — it's just display) rendered in the closed-poll view above `ClosedBreakdown`:

- Input: `overrides: { overriddenAt: string; overriddenByName: string | null; oldWinnerName: string; newWinnerName: string; reason: string | null }[]` sorted newest-first.
- Layout: a `Card` with info tone (uses `--accent-brand` border or the existing `status-cancelled` tone repurposed — pick the one that reads *notable but non-alarming*; leaning on `--surface-raised` with a colored left border).
- First row: `Winner overridden · <relative time>`. Below: `was <old> → now <new>`. If `reason`, show it quoted italic.
- If `overrides.length > 1`, a `<details>` disclosure titled "History (N changes)" showing each prior override with actor + time.

Reads `poll_overrides` joined against `users(display_name)` and `restaurants(name)` in `page.tsx` server-side; passes the flattened shape to the banner.

## Closed-view integration

In `app/polls/[id]/page.tsx`, inside the `status === 'closed'` branch:

```ts
const { data: overrides } = await admin
    .from('poll_overrides')
    .select('overridden_at, reason, overridden_by:users(display_name), old:restaurants!old_winner_id(name), new:restaurants!new_winner_id(name)')
    .eq('poll_id', poll.id)
    .order('overridden_at', { ascending: false })
```

Then the closed branch renders:

```tsx
<>
  {overrides?.length ? <OverrideBanner overrides={mapped} /> : null}
  <ClosedBreakdown ... />
</>
```

No changes to `ClosedBreakdown` itself — winner highlighting already follows `poll.winner_id`.

## Test plan

**Type-check + lint:** `pnpm exec tsc --noEmit` and `pnpm exec eslint` on the changed files.

**Manual Playwright MCP flow:**

1. Sign in as admin (`/login` → "Yi Guo (Personal)(admin)").
2. Close a poll (or use an already-closed poll from seed data — the Alice test poll from gap #1 work will be closed eventually if we advance time, or we can seed one).
3. Go to `/admin/polls`, filter to `Closed`, open the row actions for a closed poll. Verify the "Override winner…" item exists.
4. Open modal. Verify current winner is shown, select lists all *other* ballot restaurants, reason textarea caps at 200 chars.
5. Pick a new winner, type a reason, click "Override winner". Modal closes, row's Winner column updates on refresh.
6. Navigate to the poll page. Verify:
   - Banner appears above the breakdown.
   - Current winner highlight is on the new restaurant.
   - Original tally breakdown is unchanged.
7. Override again (to a third restaurant). Verify the banner shows the latest change; History disclosure lists both.
8. **Credit verification (DB):** pick a pre-override voter, confirm their `votes` row for the original winner is un-exercised and a `votes` row for the new winner is exercised (if they had voted for it).
9. **Reject invalid inputs:** attempt to POST the action with a `new_winner_id` not on the ballot → server rejects.
10. **Same winner:** pick the current winner from the select (should not be offered, but verify server-side guard by hand-editing FormData in devtools if time permits).
11. **Race smoke test:** in one tab, cancel the poll while the override modal is open. Click Override. Expect the error surface ("Poll is no longer finalized.").

**No new automated tests** — bar matches gap #1 and the broader repo convention.

## Rollback

- Revert the lib, action, page, modal, banner, polls-table, schema changes.
- Migrations don't auto-rollback, but 0003 can be dropped with `drop table poll_overrides cascade;`. The override state lives entirely in `poll_overrides` + `polls.winner_id`. To restore pre-override data, need a manual query: for each override (latest first), flip credits back and restore `winner_id` to the `old_winner_id`. Recommend: if rolling back in production, take a pg_dump first.

## Out of scope for the implementation step

- Admin "change cancel reason" — separate.
- Override history on the admin polls table row — keep the row tidy; history lives on the voter page.
- Rate-limiting / idempotency keys — internal app, trust the admin.
