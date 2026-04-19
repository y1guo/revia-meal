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
3. **If there are no votes**, set `cancelled_at = now()`, `cancellation_reason = 'no_votes'`. Done — no credit movement.
4. **Otherwise**, run the per-user banked-credit tally (see [Rolling credits](#rolling-credits-per-user-per-restaurant)):
   - For each restaurant `R` on the ballot:
     - `today_voters(R)` = the set of users who voted for `R` in this poll
     - `tally(R)` = sum over each `u ∈ today_voters(R)` of: sum of `vote_weight` from all rows where `user_id=u, restaurant_id=R, template_id=T, exercised_at IS NULL` (this includes today's row, which is itself unexercised)
   - Choose the winner as the restaurant with the highest tally (tiebreaker below).
   - **Snapshot the breakdown**: insert one `poll_results` row per ballot restaurant with `today_votes`, `banked_boost`, `total_tally`. This freezes the historical view of why this winner won, even after later polls exercise some of these credits.
   - **Atomically claim the finalization** with `UPDATE polls SET finalized_at=now(), winner_id=<winner> WHERE id=<poll> AND finalized_at IS NULL AND cancelled_at IS NULL RETURNING id`. If the update returns no row, another finalizer beat us — bail out without exercising.
   - **Exercise** every banked credit that contributed to the win: `UPDATE votes SET exercised_at=now(), exercised_poll_id=<this poll> WHERE template_id=T AND restaurant_id=<winner> AND user_id IN (today_voters(winner)) AND exercised_at IS NULL`. This zeros out the personal balance for every voter who got their wish today.

The atomic claim on `polls` is the race-safety pivot: only one finalizer can flip `finalized_at` from NULL to set, so only one winner is ever recorded — which matters when ties resolve via random pick. The exercise step that follows is idempotent (it filters `exercised_at IS NULL`).

### Cancellation

A poll can be cancelled two ways:

- **Automatic** — no votes at `closes_at`. The finalization path writes `cancelled_at` and `cancellation_reason = 'no_votes'`. No credit movement.
- **Admin** — from `/admin/polls`, an admin may cancel a poll while its status is `scheduled` or `open`. The action writes `cancelled_at`, `cancellation_reason = 'admin'`, and `cancelled_by`. Any votes already cast are simply ignored — no credit movement.

Cancelled polls remain visible in history with a clear cancelled label. A cancelled poll cannot itself be reopened. The schema permits a fresh poll for the same date (the cancelled row sits outside the partial unique index), but actually creating it is a deliberate admin action — not something lazy instantiation does on its own. That admin "re-instantiate" action is a roadmap item, not MVP.

## Voting rules

1. **One credit per poll.** Each user has exactly 1 voting credit per poll, evenly split across their picks at submit time. A row in `votes` carries the resulting `vote_weight = 1 / picks_count`.
2. **One template per user per local date.** A user may participate in only one template's poll for a given `scheduled_date`. Enforced by the `daily_participation` row created on their first vote of the day. Unpicking every restaurant does not release the lock.
3. **Freely editable while open.** Users add and remove picks at any time during the open window. Updating picks rewrites that user's rows for the poll (DELETE+INSERT) and updates `vote_weight` to the new split.

## Rolling credits (per user, per restaurant)

The credit ledger is the `votes` table itself. A row that hasn't been **exercised** is both a historical vote and a banked credit for `(user, template, restaurant)` worth `vote_weight`.

The mechanism is per-user attribution under per-restaurant scoring — the system picks a restaurant as the winner, but each user's credits are tracked individually so the right people are rewarded.

**A user's banked credit only counts if they show up AND vote for that restaurant today.** This solves two failure modes the naive per-restaurant model has:

- **Wrong-audience problem.** If Alice's banked Sushi credits could win a poll on a day she's at Dinner instead of Lunch, today's Lunch voters get stuck eating Sushi nobody currently wants. With the gate, her credits sit unexercised until she's present and voting Sushi again.
- **Today's preference vs. yesterday's.** If Alice has banked Sushi credits but feels like Pizza today, only her Pizza credits trigger. Her Sushi credits stay banked for next time.

### Tally formula

For a poll `Q` in template `T`, for each restaurant `R` on the ballot:

```
today_voters(R)   = users with a vote row in poll Q for restaurant R
tally(R)          = sum over u in today_voters(R) of (
                       sum of vote_weight from votes
                         where user_id=u, restaurant_id=R, template_id=T,
                               exercised_at IS NULL
                    )
```

Today's row is itself unexercised (until finalize), so it's included in the inner sum naturally.

### Winner reset (exercise)

When `R` wins poll `Q`:

```
UPDATE votes
   SET exercised_at = now(), exercised_poll_id = Q
 WHERE template_id = T
   AND restaurant_id = R
   AND user_id IN (today_voters(R))
   AND exercised_at IS NULL
```

A user who voted for the winner today has *all* their R-credits in this template exercised — full personal reset. Their credits for other restaurants stay untouched. Other voters' credits for R also stay untouched (they didn't get their wish today).

### Tiebreaker

If two or more restaurants tie for the highest tally, the winner is chosen **uniformly at random** from the tied restaurants — picked inside the finalization transaction (e.g. `ORDER BY tally DESC, random() LIMIT 1`) and locked in by the commit.

### Why no cap, no decay

A restaurant that *no current voter ever picks* can't accumulate against this poll's tally — its banked credits, if any, belong to people not voting for it today and don't trigger. So the empty-vote-skip is the natural ceiling: there's no "vegan option no one ever wanted finally wins in month 6" failure mode. No cap or decay needed.

## Visibility rules

Anonymity during voting prevents bandwagon and anchoring effects; full transparency post-close keeps the system trustworthy and explainable.

| Data | Open | Post-close |
|---|---|---|
| Your own vote | visible | visible |
| Your own banked credits per restaurant | visible | visible |
| Live aggregate tally | hidden | — |
| Final per-restaurant breakdown (today's votes + banked boost = tally) | — | visible |
| Winner + winner reasoning | — | visible |
| Who-voted-what (other people's picks) | hidden | visible |
| Participant count | visible | visible |

The "your own banked credits" view shows each restaurant with a small annotation like `+0.5 banked` next to the option — actionable for the voter, doesn't leak who else might boost it, doesn't change as other people vote.

## Auditability

Every credit movement is implicit in the `votes` table:

- A row created → that user banked `vote_weight` for `(template, restaurant)`.
- A row updated to set `exercised_at` → that credit was consumed by `exercised_poll_id` (the winning poll).
- No separate audit log needed; the table is append-mostly with one terminal state transition (`exercised_at` set) per row.

The same table powers the [/people spectrum](features.md) page, which aggregates each user's vote rows by restaurant over a date range.
