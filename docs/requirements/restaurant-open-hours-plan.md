# Plan — Restaurant weekly open hours

Implements [restaurant-open-hours.md](./restaurant-open-hours.md).

## Changes

**New**
- `db/migrations/0005_restaurant_hours.sql` — the new table.
- `app/admin/restaurants/[id]/hours-editor.tsx` — the seven-day editor component.

**Modified**
- `lib/polls.ts` — in `ensureTodaysPoll`, after snapshotting `template_restaurants`, filter out restaurants that are closed on the poll's day-of-week. Uses a single extra query against `restaurant_hours` scoped to the candidate ids.
- `app/admin/restaurants/[id]/page.tsx` — fetch existing hours and mount the editor below the existing fields.
- `app/admin/restaurants/[id]/actions.ts` — add `saveRestaurantHoursAction(formData)` server action, admin-gated.

No changes to voter-facing pages. The feature is invisible until admin configures hours on a restaurant.

## Migration

```sql
-- 0005_restaurant_hours.sql
create table restaurant_hours (
    restaurant_id uuid not null references restaurants(id) on delete cascade,
    day_of_week smallint not null check (day_of_week between 1 and 7),
    opens_at time,
    closes_at time,
    primary key (restaurant_id, day_of_week)
);
```

ISO-8601 day-of-week (Mon=1, Sun=7) to match the existing `getDayOfWeekISO()` helper and `poll_templates.schedule.days_of_week`. No index beyond the PK — all lookups are `where restaurant_id in (…)`, which hits the PK.

## Library change: `ensureTodaysPoll`

Current flow (paraphrased):
```ts
const { data: trs } = await admin
    .from('template_restaurants')
    .select('restaurant_id')
    .eq('template_id', template.id)
    .eq('is_active', true)

if (trs && trs.length > 0) {
    await admin.from('poll_options').insert(
        trs.map((tr) => ({ poll_id: newPoll.id, restaurant_id: tr.restaurant_id })),
    )
}
```

After the fetch, add one query and a filter step:

```ts
const candidateIds = (trs ?? []).map((tr) => tr.restaurant_id as string)
const { data: hoursRows } =
    candidateIds.length > 0
        ? await admin
              .from('restaurant_hours')
              .select('restaurant_id, day_of_week')
              .in('restaurant_id', candidateIds)
        : { data: [] as { restaurant_id: string; day_of_week: number }[] }

const openDaysByRestaurant = new Map<string, Set<number>>()
for (const h of hoursRows ?? []) {
    const rid = h.restaurant_id as string
    if (!openDaysByRestaurant.has(rid)) openDaysByRestaurant.set(rid, new Set())
    openDaysByRestaurant.get(rid)!.add(h.day_of_week as number)
}

const todayDow = getDayOfWeekISO(timezone)
const filtered = candidateIds.filter((rid) => {
    const openDays = openDaysByRestaurant.get(rid)
    // No rows at all → treat as "always open" (backwards compat).
    if (!openDays) return true
    return openDays.has(todayDow)
})
```

Then insert `filtered` ids instead of all `candidateIds`. The rest of the function is unchanged.

## Hours editor (`hours-editor.tsx`)

- Client component driven by a `useState<DayConfig[]>` of exactly seven entries (one per day, Mon..Sun).
- Each row: label (`Mon`, `Tue`, …, `Sun`), a `Switch` for open/closed, and — when open — two `TextInput`s (or `<input type="time">`) for `opens_at` and `closes_at`, both optional.
- Above the rows: a small caption explaining the semantics in one line. Below the rows: `Save hours` button (disabled until the state differs from `initialHours` prop).
- On save: `startTransition(async () => { await saveRestaurantHoursAction(formData); router.refresh(); })`. Matches the existing admin edit forms.

Validation: the editor allows blank times (both empty = "open all day"). If one is filled and the other isn't, block save with inline error — half-filled is meaningless. Server re-validates.

## Server action: `saveRestaurantHoursAction`

```ts
export async function saveRestaurantHoursAction(formData: FormData) {
    await requireAdmin()
    const restaurantId = String(formData.get('restaurant_id') ?? '')
    if (!restaurantId) throw new Error('Missing restaurant_id.')

    const days: DayConfig[] = []
    for (let dow = 1; dow <= 7; dow++) {
        const open = formData.get(`day_${dow}_open`) === '1'
        const raw_opens = String(formData.get(`day_${dow}_opens`) ?? '').trim()
        const raw_closes = String(formData.get(`day_${dow}_closes`) ?? '').trim()
        days.push({
            day_of_week: dow,
            open,
            opens_at: raw_opens || null,
            closes_at: raw_closes || null,
        })
    }

    const result = await setRestaurantHours(restaurantId, days)
    if (!result.ok) throw new Error(result.error)
    revalidatePath(`/admin/restaurants/${restaurantId}`)
    revalidatePath('/admin/restaurants')
}
```

`setRestaurantHours(restaurantId, days)` lives in a new `lib/restaurants.ts` (or colocated — let me keep infra tight). Implementation: validate each day, compute open-days and closed-days lists, `delete from restaurant_hours where restaurant_id = ? and day_of_week in (closedDays)`, `upsert` for open days. Use `time` values as `HH:MM` strings; Postgres accepts them.

Validation per-day:
- `open === false` ⇒ `opens_at` / `closes_at` ignored (server treats as null, deletes row).
- `open === true` ⇒ either both times are null, or both are valid `HH:MM` strings. Reject `open: true, opens_at: "11:00", closes_at: null`.

## Admin page integration

Look for the existing restaurant detail page (probably `app/admin/restaurants/[id]/page.tsx`). Before the component render, `select * from restaurant_hours where restaurant_id = ?`. Build a `DayConfig[]` with a row per day (fill from DB, else default `{ open: false }`). Pass to `<HoursEditor restaurantId={id} initialHours={…} />`.

## Test plan

**Type-check + lint** as usual.

**Manual Playwright MCP:**
1. Sign in as admin. Navigate to `/admin/restaurants/<banh-mi-id>`.
2. Configure: open Mon-Sat, closed Sun. Save.
3. Verify DB: six rows in `restaurant_hours` (days 1-6), no row for day 7.
4. In `/admin/polls`, cancel today's Healthy Club poll (if it's Sunday in the template tz) — expect next-day instantiation to exclude Banh Mi Saigon. Or: manipulate `scheduled_date` / run the shift-poll script to land a poll on Sunday, then verify its `poll_options` doesn't include Banh Mi.
5. Revert: set Banh Mi back to "all days open" (or delete all hours rows by configuring all days closed then reopening to open-every-day state — clarify: to reset to "unconfigured," we'd need to delete all rows, which the UI doesn't expose. Accept this; admin can leave everything open, which has the same practical effect except the row set is present).

**Database check shortcut:**
```sh
psql ... -c "select * from restaurant_hours where restaurant_id = '<id>' order by day_of_week;"
```
(or via Supabase dashboard SQL editor)

## Rollback

- Revert code.
- `drop table restaurant_hours cascade;` — no other tables reference it.
- `ensureTodaysPoll` returns to its pre-change behavior since the filter step is removed alongside.

## Open questions / future

- **Voter-facing hours.** Deferred to #8 (rich restaurant content) per the spec.
- **"Unconfigured vs all-open" UX confusion.** The convention "no rows = always open" is invisible to admins once they open the editor (they see seven rows with defaults). Acceptable for now; doc the convention in the editor's caption.
