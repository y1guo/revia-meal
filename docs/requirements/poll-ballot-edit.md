# Requirements — Admin edit of an open poll's ballot

Originally filed as part of gap #3 in [feature_gaps.md](../../feature_gaps.md). The "snapshot so template edits don't rewrite history" half is **already implemented** — `poll_options` rows are written at poll instantiation from `template_restaurants` and never touched afterwards; the poll page reads restaurants from `poll_options`, not from the live template. Nothing to do there.

The remaining requirement is the live-poll edit: admins need to add or remove restaurants on a poll that is still open, so they can react when a restaurant is unexpectedly closed or the group wants an ad hoc option. Design decisions below come from our earlier discussion.

## Goals

- On `/admin/polls`, scheduled and open polls gain an `Edit ballot…` row action that opens a modal showing the current ballot and allowing add/remove.
- **Remove ≠ delete.** A removed restaurant is soft-disabled, not purged. Existing votes for it are preserved. The winner-selection algorithm excludes it. Voters see it disabled.
- **Add.** Admin can bring in any active restaurant from the catalog that isn't already on the ballot (including re-activating a previously-disabled one; the prior votes reactivate).
- **Voter UX on a disabled option**: the checkbox is visually disabled and unclickable, but if the user already voted for it their tick stays visible. They can *unvote* (remove the tick); once removed they cannot put it back. The unvote is optional — if they never come back, their existing vote-weight on the disabled option still counts toward that restaurant's credit-bank accrual.
- **Auto-cancel edge case**: when a poll closes and every ballot option is disabled, the poll auto-cancels with reason "no available restaurants on the list" (a new cancellation sub-reason alongside `'no_votes'` and `'admin'`).

## Non-goals

- **No changes while the poll is `closed`, `pending_close`, or `cancelled`.** Bump the ballot at those states is a different workflow (either cancel-and-reinstantiate, or use the override-winner flow we just shipped).
- **No notifications** to voters about admin edits. The UI reflects the change on their next load; that's the notification.
- **No reason field** on the admin edit action itself. Keep the action lightweight; per-change audit is out of scope.
- **No template-level propagation.** Editing the ballot on a specific poll does not change the template. If admins want the template to reflect reality, they edit the template separately.

## Behavior

### Data model

Add a single nullable column to `poll_options`:

```sql
alter table poll_options add column disabled_at timestamptz;
```

- `null` = active on the ballot.
- non-null = soft-disabled at that timestamp.

Remove = set `disabled_at = now()`. Re-add an existing row = set `disabled_at = null`. Add-new = `insert into poll_options (poll_id, restaurant_id) values (…, …)` (disabled_at defaults null).

No audit table for edits. `disabled_at` is the only signal; if we need "who did it, why" later we'll add it. Keep the surface tiny.

### Server mutation — `editPollBallot`

```ts
export type BallotEditResult =
    | { status: 'ok' }
    | { status: 'noop' }
    | { status: 'error'; error: string }

export async function editPollBallot(args: {
    adminUserId: string
    pollId: string
    added: string[]    // restaurant ids to add or re-enable
    removed: string[]  // restaurant ids to soft-disable
}): Promise<BallotEditResult>
```

Order of operations:
1. Fetch the poll; reject unless status is `scheduled` or `open` (and not cancelled).
2. Fetch all restaurants in `added ∪ removed` from the catalog; reject if any id isn't in `restaurants` or isn't `is_active`.
3. For ids in `added`: `upsert` with `onConflict: 'poll_id,restaurant_id'` setting `disabled_at = null`. Covers both add-new and re-enable.
4. For ids in `removed`: `update` rows to `disabled_at = now()` filtered to this poll.
5. Prevent the "all-empty" trap: if after the edit there would be zero rows with `disabled_at IS NULL`, reject with "Can't disable the entire ballot. Cancel the poll instead." Keeps admins from accidentally triggering auto-cancel from the edit modal.

No `daily_participation` changes. No vote row changes. The votes table is append-only under ballot edits.

### Open poll view — voter UI

- On [vote-form.tsx](../../app/polls/[id]/vote-form.tsx), each row is now driven by a `Ballot` entry that also carries `disabled: boolean`:
  - `disabled: true && user never voted for it` → checkbox rendered but disabled; row text muted; a small "Removed" chip.
  - `disabled: true && user has this in their initial picks` → same muted/disabled appearance, BUT the checkbox can still be unchecked (onUncheck path). After unchecking, the row's checkbox becomes fully disabled (no re-tick).
  - `disabled: false` → normal.
- The existing autosave machinery handles the save. The vote-save path (`lib/votes.ts` → `submitVoteForUser`) needs one change: picks going *in* must not include any currently-disabled option (since the UI prevents it, a server-side guard is defense in depth).

### Finalization and credit accrual

- `finalizePoll` already reads from `poll_options`. Update its ballot-fetch to filter `disabled_at IS NULL` when computing the tally / winner candidates. Disabled options don't compete for the win, as the user specified.
- Credit bank accrual (the "roll over to losers' banks" accounting) operates on `votes` rows and doesn't look at `poll_options.disabled_at`. So votes on disabled options still bank for that restaurant — as the user specified.
- Auto-cancel: if the filtered ballot (active options with any today votes) is empty, `finalizePoll` auto-cancels with a new reason `'no_available_restaurants'`. This is additive to the existing `'no_votes'` branch.

### Cancellation reason schema

Add `'no_available_restaurants'` to whatever is documenting the allowed values for `polls.cancellation_reason`. Today the column is `text` with no constraint, so no schema change needed — but update copy in UI where the reason is rendered.

## UX copy

- Admin modal title: **Edit ballot**
- Body: two columns / list, "On the ballot" and "In catalog, not on the ballot," each with checkboxes. Moving between them marks additions/removals; a footer shows the diff ("+2 added, 1 removed") before save.
- Save button disabled when the diff is empty; no-op on server.
- Small inline note: "Removed restaurants stay on the ballot greyed out for people who already voted for them. Their votes still count toward credit-bank accrual; they just can't win."
- Voter-side disabled row: strikethrough is wrong (multi-line names), so use: muted text color + a subtle `bg-surface-sunken` overlay + a small chip `Removed`. Per design brief: not strikethrough on multi-line.

## Edge cases

- **Admin edit while finalization is in progress.** Finalize already atomically claims the poll; if the ballot edit lands after the atomic claim, its changes don't affect the winner that was already picked. Acceptable — same "narrow race" stance as the rest of the app.
- **Admin re-enables a previously-disabled option after its voters have unvoted.** Their unvotes persist; they'd need to re-tick manually. Consistent with the user's "once revoked, can never re-vote on disabled" rule — when the option comes back, it's no longer disabled, so re-voting IS allowed.
- **Voter visits mid-edit.** Next render, they see the new disabled state. If they were mid-autosave, the save still succeeds because their pick was valid at save-start; the next render just updates visuals. Acceptable.
- **Admin removes the current winner of a finalized poll.** Not applicable — edit is blocked on finalized polls. Use the override-winner flow from gap #2 instead.

## Success criteria

- Admin can open the Edit-ballot modal on any scheduled or open poll, add/remove restaurants, and see the change reflected on the voter page next render.
- Removed restaurants show as disabled to voters who hadn't picked them and as disabled-but-unchecked-possible to voters who had.
- Voter votes on disabled options still appear in the post-close per-restaurant tally (today + banked = total), but the disabled restaurant is never declared winner.
- When the last active option is removed and the poll then closes, it auto-cancels with reason `no_available_restaurants`.
- Server rejects the "remove all" request from the admin modal with a clear error.
