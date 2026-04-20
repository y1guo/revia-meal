# Requirements — Manual override of poll winner

Sometimes the boss announces the restaurant regardless of the poll. Today the poll's `winner_id` is immutable once set by `finalizePoll`, and the voters' banked credits reflect the computed winner — so overriding reality means the credit bank becomes a fiction. Admins need a first-class action to correct the winner and the credit-bank movement at the same time.

## Goals

- Let admins replace the `winner_id` of a closed (finalized) poll with another restaurant from that poll's ballot.
- Move credits correctly: un-exercise the old winner's exercised credits (roll them back into voters' banks) and exercise the new winner's credits (spend them from voters' banks).
- Preserve a complete audit trail: who overrode, when, old → new, and an optional reason.
- Make the override visible to voters on the closed-poll page so the record stays honest.
- Support being applied more than once on the same poll (override, then correct the override, etc.) without data corruption.

## Non-goals

- **Overriding open / scheduled / cancelled polls.** If the boss announces before the poll closes, the admin should cancel the poll (existing capability). Override only touches *finalized* polls.
- **Admin-triggered cancellation with a reason field.** Separate gap if needed; the existing `cancelPoll` already fires with `cancellation_reason = 'admin'`.
- **Rewriting the `poll_results` snapshot.** That table captures the *computed* tally at finalization — the honest historical record. Overrides live in a parallel audit table; the snapshot is never mutated.
- **Notifying voters via email / push.** The closed-poll page surfaces the override inline; we don't have a push channel.

## Behavior

- **Where the action lives.** A new row action `Override winner…` on [/admin/polls](../../app/admin/polls), visible only when the row's status is `closed`. Opens a modal.
- **Modal UX.** Dismissable, non-blocking, matches the existing `DestructiveConfirmModal` pattern. Body contains:
  - Current winner (read-only).
  - A select / radio list of the other ballot restaurants (excluding the current winner).
  - Optional `Reason` textarea (short free-form, ~200 chars, nullable).
  - Clear explanation of the credit-bank consequence in plain copy: "Voters' banked credits will shift: old-winner voters get their credits back, new-winner voters have theirs spent."
  - Primary button `Override winner` (destructive tone). Secondary `Cancel`.
- **Server mutation** (admin-only server action). In order:
  1. Reject if poll is not finalized, or is cancelled, or if the new winner is not on that poll's ballot, or if the new winner equals the current winner (no-op guard).
  2. Un-exercise the current winner's rows for this poll: `UPDATE votes SET exercised_at=null, exercised_poll_id=null WHERE exercised_poll_id = <poll>`.
  3. Set `polls.winner_id` to the new winner.
  4. Exercise the new winner's rows for this poll's voters: `UPDATE votes SET exercised_at=now(), exercised_poll_id=<poll> WHERE template_id=<poll.template_id> AND restaurant_id=<new> AND user_id IN (<today's voters>) AND exercised_at IS NULL`.
  5. Insert a `poll_overrides` row: `(poll_id, overridden_by, old_winner_id, new_winner_id, reason, overridden_at=now())`.
- **Concurrency guard.** The mutation checks `finalized_at IS NOT NULL AND cancelled_at IS NULL` as part of the winner-update WHERE clause so a concurrent cancel / finalize can't race in silently. Like the rest of the finalization flow, we accept the sub-millisecond race window documented in the current MVP — this is an internal 15-person app.
- **Idempotency / repeated override.** Each action creates a fresh `poll_overrides` row; `polls.winner_id` becomes the latest new winner. There's no limit on how many times a poll can be overridden, and overriding back to the original is just another override.

## Data model

New migration adding:

```sql
CREATE TABLE poll_overrides (
    id             uuid primary key default gen_random_uuid(),
    poll_id        uuid not null references polls(id) on delete cascade,
    overridden_at  timestamptz not null default now(),
    overridden_by  uuid not null references users(id) on delete restrict,
    old_winner_id  uuid not null references restaurants(id) on delete restrict,
    new_winner_id  uuid not null references restaurants(id) on delete restrict,
    reason         text
);
create index poll_overrides_poll_idx on poll_overrides (poll_id, overridden_at desc);
```

- `on delete cascade` on `poll_id` because cancelling cascades votes already; we don't want orphan overrides. Cancel + re-instantiate with the same scheduled_date stays consistent.
- `restrict` on restaurants / users so the audit trail can't lose the referenced rows.
- `poll_results` untouched.
- `polls` table untouched (winner_id is updated in place, as today).

## Voter-facing UI (closed-poll page)

- When `poll_overrides` has any rows for this poll, render an info banner *above* the existing `ClosedBreakdown` on [/polls/:id](../../app/polls/[id]/page.tsx):
  - Line 1: `Winner overridden by <admin display name> · <relative time>`
  - Line 2 (optional): the reason text, quoted.
  - Small detail: `was <old restaurant name> → now <new restaurant name>`.
  - If multiple overrides exist, show only the most recent on the main banner; a disclosure "History (N changes)" expands a compact list below.
- The winner card / Award badge still reads `polls.winner_id`, so the *current* winner gets the highlight automatically — no special casing.
- The per-restaurant tally breakdown in `ClosedBreakdown` is unchanged: it reflects the *original* tally forever (that's the point of the snapshot). The banner explains why the declared winner might not be the tally leader.

## Edge cases

- **Poll cancelled after an override.** `cancelPoll` already clears `winner_id`; the audit rows stay (cascade only fires on hard delete, which we never do). Closed view becomes the cancelled view; the banner is no longer applicable. Acceptable.
- **Two admins override at the same time.** Both mutations proceed. Whoever's UPDATE lands last sets the final `winner_id`. Both audit rows are recorded. User-visible inconsistency resolves on next render. Same race-tolerance stance as the rest of the finalize flow.
- **Admin picks a restaurant that was on the ballot but got no votes.** The new-winner exercise step finds no votes to flip (since those voters never picked it), so no credits move for them. But the un-exercise of the old winner still happens correctly. Acceptable: the old winner's voters get their credits back, the new winner's bank doesn't gain anything (because nobody voted for it). That mirrors reality — the boss picked a restaurant the group didn't vote for.
- **Admin picks a restaurant NOT on the ballot.** Rejected by the server (must be in `poll_options`).
- **Override applied to a poll that had no voters.** The poll would have been auto-cancelled on lazy finalization (per memory). So this case never reaches override. If somehow a finalized poll with zero voters exists, the override still works structurally — it just doesn't move any credits.

## Success criteria

- Admin can navigate to `/admin/polls`, find a closed poll, open the override modal, pick a new winner from its ballot, submit, see the row's winner column update.
- DB verification: for a test poll where Alice voted for A and Bob voted for B, and A was the original winner:
  - Before override: Alice's A-row has `exercised_poll_id = <poll>`, `exercised_at != null`. Bob's B-row remains banked (`exercised_at = null`).
  - After override to B: Alice's A-row is un-exercised (`exercised_at = null`, `exercised_poll_id = null`). Bob's B-row is exercised.
  - `poll_overrides` has one row with `(old_winner_id=A, new_winner_id=B, overridden_by=<admin>)`.
- Closed poll page shows the override banner with correct copy, and the Award badge sits on B instead of A.
- Override modal refuses invalid targets (not on ballot; same as current winner; poll not closed).
- Double-override: override A → B, then B → C. Two audit rows, `polls.winner_id = C`, banner shows "was B → now C" (most recent), history collapsible shows both changes.
- No regressions in the regular finalize / cancel flows — existing test passes: cancelling a closed overridden poll un-exercises all credits and deletes daily_participation, same as today.

## Out of scope for this gap

- Manual cancel with free-form reason (tracked as a separate nice-to-have; existing cancel with `'admin'` reason still works).
- Overriding open / scheduled polls.
- Bulk override or override templates.
- Notifying affected voters out-of-band.
