# Requirements — Restaurant weekly open hours

From gap #5 in [feature_gaps.md](../../feature_gaps.md). Some restaurants are closed on certain days of the week. A poll shouldn't include them on those days. This introduces a weekly-hours model on the restaurant and filters poll instantiation by it.

## Goals

- Each restaurant can declare weekly hours: for each day of the week, it's either closed, or open (optionally with specific `opens_at` / `closes_at` times).
- When the daily poll instantiates (the `template_restaurants` → `poll_options` copy), any restaurant that declares itself closed on the poll's scheduled day-of-week is excluded from that poll's ballot. Other days are unaffected.
- Admin editor on `/admin/restaurants/:id` to configure hours.
- **Backwards-compatible default.** A restaurant with no hours rows behaves as "open every day" — existing restaurants keep working unchanged until someone configures them.

## Non-goals

- **No voter-facing hours display** in this gap. Showing "open 11–22" on the poll page is a nice-to-have that can ride with the rich-content gap (#8).
- **No time-of-day filtering.** We look at day-of-week only. If a restaurant is open 17:00–22:00 but the poll closes at 11:30, we still include it — deciding that kind of logic ties into ordering windows that aren't in this gap.
- **No per-restaurant timezone.** Hours are interpreted in the poll template's timezone. This is consistent with how a single-office lunch app works; revisit if that assumption breaks.
- **No holiday / exception handling.** For ad-hoc "closed today" cases, admins use the edit-ballot flow from #3.

## Behavior

### Data model

New table, parallel to how `poll_options` and `template_restaurants` are modeled:

```sql
create table restaurant_hours (
    restaurant_id uuid not null references restaurants(id) on delete cascade,
    day_of_week smallint not null check (day_of_week between 1 and 7),
    -- ISO-8601 day of week: 1 = Monday, 7 = Sunday. Matches the existing
    -- convention used by getDayOfWeekISO() and by poll_templates.schedule.days_of_week.
    opens_at time,
    closes_at time,
    primary key (restaurant_id, day_of_week)
);
```

Convention:
- **Row exists** = restaurant is open that day. `opens_at` and `closes_at` optional; both null = "open all day."
- **Row absent** = restaurant is closed that day.
- **Restaurant has zero rows** = special "unconfigured" state, treated as open every day. Preserves existing-data behavior.

### Filtering at poll instantiation

`lib/polls.ts` / wherever the `template_restaurants → poll_options` copy happens gets one new step. For each candidate restaurant:

1. Compute the poll's day-of-week in the template's timezone (we already have the timezone on `poll_templates.schedule.timezone`).
2. Check `restaurant_hours` rows for that restaurant:
   - If the restaurant has zero rows total → include (unconfigured = always open).
   - Else if a row exists for the poll's day-of-week → include.
   - Else → exclude from this poll.

This runs once at instantiation. If admin later configures hours for a restaurant, it only affects *future* polls — historical polls are already frozen in `poll_options` and stay that way (consistent with gap #3's snapshot semantics).

### Admin UI

New section on `/admin/restaurants/:id` below the existing fields:

- Heading: **Weekly hours**
- Seven rows, one per day (Monday first, matching the ISO convention and the existing template-schedule editor).
- Each row: a `Switch` / toggle for open/closed; when open, two time inputs for `opens_at` and `closes_at` (both optional — leaving both empty means "open all day").
- "All days open" helper button to set all seven to open with empty times — a one-click reset for restaurants with simple schedules.
- Save button writes the full set: upsert rows for open days, delete rows for closed days.
- Small explanatory copy: "Days without hours are closed. Polls won't include this restaurant on closed days. Unconfigured restaurants (no rows at all) show on every day's poll."

### Server mutation

`lib/restaurants.ts` (or the existing admin actions module) gets a `setRestaurantHours(restaurantId, days)` function:

```ts
type DayConfig = {
    day_of_week: number          // 1..7 (Mon..Sun)
    open: boolean
    opens_at?: string | null     // "HH:MM" or null
    closes_at?: string | null
}
setRestaurantHours(restaurantId, days: DayConfig[]): Promise<{ ok: true } | { ok: false; error: string }>
```

Implementation: validate shape, delete any rows for closed days, upsert for open days. Admin-only via the existing `requireAdmin` pattern.

## Edge cases

- **Admin configures hours on a restaurant already on a live poll.** The current `poll_options` rows stay — the filter only runs at instantiation. If admin *also* wants it removed from today's poll, they use the edit-ballot flow from #3.
- **All seven days closed.** Allowed; the restaurant is effectively "hidden from polls" until reconfigured. Cleaner than a separate soft-delete flag.
- **Template timezone changes.** The filter re-runs at each instantiation using the current template timezone, so moving a template to a new timezone takes effect on the next poll.
- **Restaurant gets deleted.** `restaurant_hours` rows cascade. No orphans.
- **Time strings.** Using `time` (no date, no timezone). `opens_at = '11:00'` means 11:00 AM local to the template's timezone. No validation that `opens_at < closes_at` — overnight hours (`22:00–02:00`) are uncommon but not impossible.

## Success criteria

- Admin configures Banh Mi Saigon as closed on Sunday. Next Sunday's poll doesn't include it. The Monday-to-Saturday polls still do.
- A restaurant with no hours rows shows up on every day's poll (regression-free).
- An admin screen on `/admin/restaurants/:id` clearly shows the seven days and lets them toggle + set times, and the save round-trip persists.
- Historical polls (already finalized) don't change even if hours are edited after the fact.
- Ad-hoc "closed today" workflow still works via #3's edit-ballot — no conflict.
