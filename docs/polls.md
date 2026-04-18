# Polls, voting, and rolling credits

## Poll templates

A **poll template** is a reusable configuration for a recurring lunch poll:

- a name (e.g. "Regular", "Healthy food"),
- a schedule (days of week, open time, close time, timezone),
- a set of restaurants drawn from the shared catalog.

A template **instantiates a new poll each day it runs**. Each concrete poll has its own id and its own URL, and is **immune to subsequent template-configuration changes**: `opens_at` / `closes_at` are materialized from `schedule` at instantiation, the ballot is materialized into `poll_options` from the template's currently-active restaurants, and neither is updated if the template is later edited. Edits to the template schedule or roster affect future instantiations only. A restaurant that's later removed from a template (soft deactivate) remains votable and accumulates normally in any already-open poll; its rolling balance is preserved.

## Timezone anchoring

A poll's `scheduled_date` is the **local date in the template's configured timezone**, not the server's. "Today's poll" for a template is resolved relative to that timezone, so a PT-configured template's "today" means PT today even for a user viewing from another timezone.

## Lifecycle

```
scheduled ──(now ≥ opens_at)──▶ open ──(now ≥ closes_at, has votes)──▶ closed
    │                           │
    │                           └─(now ≥ closes_at, no votes)──────▶ cancelled
    │                           │
    │                           └─(admin cancel)───────────────────▶ cancelled
    │
    └─(admin cancel)───────────────────────────────────────────────▶ cancelled
```

Status is derived from timestamps on the poll row (`opens_at`, `closes_at`, `finalized_at`, `cancelled_at`) rather than a mutable enum — see [data-model.md](data-model.md#polls).

### Lazy instantiation

When a request (dashboard load, poll link fetch, API call) references "today's poll" for an active template and **no poll row of any kind** exists for that `(template, date)` — including cancelled ones — the server inserts one. The partial unique index on `(template_id, scheduled_date) WHERE cancelled_at IS NULL` makes concurrent inserts safe: one wins, the others refetch. A cancelled poll is deliberate, so lazy instantiation does **not** resurrect it; creating a replacement for a cancelled day is an explicit admin action (roadmap).

No backfill — days the service was offline simply have no poll rows.

### Lazy finalization

A poll past `closes_at` with neither `finalized_at` nor `cancelled_at` set is in a **pending close** state. The next request that touches it finalizes inside a single transaction:

1. `SELECT ... FOR UPDATE` on the poll row.
2. Re-check the poll is still pending close (another concurrent finalizer may have already done the work).
3. **If there are no votes**, set `cancelled_at = now()`, `cancellation_reason = 'no_votes'`. Done.
4. **Otherwise**:
   - For each user who voted, their per-pick weight is `1 / (their pick count in this poll)`.
   - For each restaurant in the poll, its **poll contribution** is the sum of per-pick weights from every voter who picked it.
   - Add the contribution to `template_restaurants.accumulated_credits` for each restaurant. Write a `restaurant_credit_events` row with `reason = 'poll_accumulation'` for each.
   - Choose the winner as the restaurant with the highest new total (tiebreaker below).
   - Apply the winner reset to the winner's balance and write a `restaurant_credit_events` row with `reason = 'winner_reset'`.
   - Set `finalized_at = now()` and `winner_id`.

All in one transaction: either the poll is fully finalized or not at all.

### Cancellation

A poll can be cancelled two ways:

- **Automatic** — no votes at `closes_at`. The finalization path writes `cancelled_at` and `cancellation_reason = 'no_votes'`. No credit movement.
- **Admin** — from `/admin/polls`, an admin may cancel a poll while its status is `scheduled` or `open`. The action writes `cancelled_at`, `cancellation_reason = 'admin'`, and `cancelled_by`. Any votes already cast are simply ignored — no credit movement.

Cancelled polls remain visible in history with a clear cancelled label. A cancelled poll cannot itself be reopened. The schema permits a fresh poll for the same date (the cancelled row sits outside the partial unique index), but actually creating it is a deliberate admin action — not something lazy instantiation does on its own. That admin "re-instantiate" action is a roadmap item, not MVP.

## Voting rules

1. **One credit per poll.** Each user has exactly 1 voting credit to spend per poll. There is no per-user balance carried across polls — users are stateless on credits.
2. **One template per user per local date.** A user may participate in only one template's poll for a given `scheduled_date`. This is enforced by the `daily_participation` row created on their first vote of the day. Unpicking every restaurant does not release the lock.
3. **Freely editable while open.** Users add and remove picks at any time during the open window. A pick is just a row in `votes`.
4. **Even split at close.** At finalization, a user who picked `n` restaurants contributes `1/n` to each of those restaurants. A user who ended the open window with zero picks contributes nothing (and effectively didn't vote — but their `daily_participation` lock remains).

## Rolling credits on restaurants

Each `(template, restaurant)` carries an `accumulated_credits` balance. At finalization, each restaurant's poll contribution is **added** to its balance.

- The restaurant with the highest balance after the add is the winner.
- The winner's balance is then **reduced**. The exact reduction is the one piece of the deferred algorithm — current placeholder is **full reset to 0**.
- Every other restaurant keeps its new, higher balance — this is the rollover. Options that keep almost-winning eventually win.

Because accumulation lives on `(template, restaurant)`, a restaurant that appears in both Regular and Healthy has two independent balances; a win in one template leaves the other untouched.

### Tiebreaker

If two or more restaurants end up tied for the highest total, the winner is chosen **uniformly at random** from the tied restaurants. The choice is made inside the finalization transaction (e.g. `ORDER BY total DESC, random() LIMIT 1`) and locked in by the commit. A more structured rule — e.g. biased toward whichever tied restaurant has been losing ties the longest — can be picked in the algorithm session if we want it.

## What is deliberately NOT decided yet

After the move to restaurant-owned credits, the open questions for the dedicated design session shrink to:

- **Winner reduction size.** Full reset to 0 (current placeholder) vs. a partial reduction (subtract the second-place total, subtract the winning margin, subtract a fixed amount, etc.).
- **Decay over time.** Whether accumulated balances should decay (e.g. a percent per week) to avoid long-dormant options eventually dominating.
- **Tiebreaker rule** beyond the deterministic placeholder.

The earlier open questions around daily grants, user-owned credit weighting, new-user seeding, and per-user caps are all obsolete under this model.

## Auditability

Every accumulated-credit change is written to `restaurant_credit_events`:

- `poll_accumulation` — a restaurant gained credit from a closing poll.
- `winner_reset` — the winner's balance was reduced on close.
- `admin_adjustment` — an admin manually tweaked a balance.
- `decay` — (future) a decay sweep reduced balances.

The leaderboard history and any algorithm debugging both read from this log.
