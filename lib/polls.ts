import { fromZonedTime } from 'date-fns-tz'
import { createAdminClient } from '@/lib/supabase/admin'

export type Schedule = {
    days_of_week?: number[]
    opens_at_local?: string
    closes_at_local?: string
    timezone?: string
}

export type PollStatus =
    | 'scheduled'
    | 'open'
    | 'pending_close'
    | 'closed'
    | 'cancelled'

type PollTimestamps = {
    opens_at: string
    closes_at: string
    finalized_at: string | null
    cancelled_at: string | null
}

export function getPollStatus(
    poll: PollTimestamps,
    now: Date = new Date(),
): PollStatus {
    if (poll.cancelled_at) return 'cancelled'
    if (poll.finalized_at) return 'closed'
    const t = now.getTime()
    if (t < new Date(poll.opens_at).getTime()) return 'scheduled'
    if (t < new Date(poll.closes_at).getTime()) return 'open'
    return 'pending_close'
}

export function getLocalDateISO(timezone: string, now: Date = new Date()): string {
    // en-CA's short date format is YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now)
}

export function getDayOfWeekISO(
    timezone: string,
    now: Date = new Date(),
): number {
    const name = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long',
    }).format(now)
    const map: Record<string, number> = {
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
        Sunday: 7,
    }
    return map[name] ?? 0
}

export function shouldRunToday(schedule: Schedule): boolean {
    if (!schedule.timezone) return false
    if (!schedule.days_of_week || schedule.days_of_week.length === 0) return false
    return schedule.days_of_week.includes(getDayOfWeekISO(schedule.timezone))
}

export type TemplateRow = {
    id: string
    name: string
    description: string | null
    schedule: Schedule
    is_active: boolean
}

/**
 * Returns today's poll id for the template — reusing an existing row or
 * lazily creating one. Existing rows always win, even when the template's
 * current schedule would not have instantiated one today. Display and
 * voting key off poll rows, not off the template's current schedule.
 *
 * Returns null when:
 *   - an admin previously cancelled today's poll (don't auto-resurrect)
 *   - no row exists yet AND the template is inactive or not scheduled today
 *   - the schedule is invalid/incomplete at creation time
 */
export async function ensureTodaysPoll(
    template: Pick<TemplateRow, 'id' | 'schedule' | 'is_active'>,
): Promise<string | null> {
    const { timezone, opens_at_local, closes_at_local } = template.schedule
    if (!timezone) return null

    const today = getLocalDateISO(timezone)
    const admin = createAdminClient()

    const { data: existing } = await admin
        .from('polls')
        .select('id, cancelled_at')
        .eq('template_id', template.id)
        .eq('scheduled_date', today)

    const list = existing ?? []
    const active = list.find((p) => !p.cancelled_at)
    if (active) return active.id
    // An admin previously cancelled today's poll — honor that.
    if (list.some((p) => p.cancelled_at)) return null

    // No poll exists yet — creation is gated by the current schedule.
    if (!template.is_active) return null
    if (!shouldRunToday(template.schedule)) return null
    if (!opens_at_local || !closes_at_local) return null

    const opens = fromZonedTime(`${today}T${opens_at_local}:00`, timezone)
    const closes = fromZonedTime(`${today}T${closes_at_local}:00`, timezone)

    const { data: newPoll, error } = await admin
        .from('polls')
        .insert({
            template_id: template.id,
            scheduled_date: today,
            opens_at: opens.toISOString(),
            closes_at: closes.toISOString(),
        })
        .select('id')
        .single()

    if (error || !newPoll) {
        // Concurrent insert raced us — fall back to whatever's there now.
        const { data: raced } = await admin
            .from('polls')
            .select('id')
            .eq('template_id', template.id)
            .eq('scheduled_date', today)
            .is('cancelled_at', null)
            .maybeSingle()
        if (!raced) {
            console.error('[ensureTodaysPoll] insert failed:', error?.message)
        }
        return raced?.id ?? null
    }

    // Snapshot the ballot from currently-active template_restaurants.
    const { data: trs } = await admin
        .from('template_restaurants')
        .select('restaurant_id')
        .eq('template_id', template.id)
        .eq('is_active', true)

    if (trs && trs.length > 0) {
        await admin.from('poll_options').insert(
            trs.map((tr) => ({
                poll_id: newPoll.id,
                restaurant_id: tr.restaurant_id,
            })),
        )
    }

    return newPoll.id
}

export type DashboardEntry = {
    template: TemplateRow
    poll: {
        id: string
        scheduled_date: string
        opens_at: string
        closes_at: string
        finalized_at: string | null
        cancelled_at: string | null
        cancellation_reason: string | null
    }
    status: PollStatus
}

/**
 * Every poll scheduled for today across all templates, driven by the poll
 * rows themselves. For each active template whose current schedule includes
 * today, a poll is lazily instantiated before the listing query. Any
 * pre-existing open poll with today's `scheduled_date` is included too —
 * even if the template is now inactive or its schedule no longer covers
 * today — so schedule edits don't orphan a live poll.
 *
 * Cancelled polls are excluded. Pending-close polls are finalized first.
 */
export async function getTodaysDashboard(): Promise<DashboardEntry[]> {
    const admin = createAdminClient()
    const { data } = await admin
        .from('poll_templates')
        .select('id, name, description, schedule, is_active')
        .order('name')

    const templates = (data ?? []) as TemplateRow[]
    if (templates.length === 0) return []

    // Kick off creation for active, scheduled-today templates in parallel.
    await Promise.all(
        templates
            .filter((t) => t.is_active && shouldRunToday(t.schedule))
            .map((t) => ensureTodaysPoll(t)),
    )

    // Query polls by (template, today-in-its-tz). Batch per timezone so
    // multiple templates sharing a tz only need one round trip.
    const templatesByTZ = new Map<string, TemplateRow[]>()
    for (const t of templates) {
        const tz = t.schedule?.timezone
        if (!tz) continue
        const bucket = templatesByTZ.get(tz) ?? []
        bucket.push(t)
        templatesByTZ.set(tz, bucket)
    }

    const pollRows = (
        await Promise.all(
            Array.from(templatesByTZ.entries()).map(async ([tz, ts]) => {
                const today = getLocalDateISO(tz)
                const { data: rows } = await admin
                    .from('polls')
                    .select(
                        'id, template_id, scheduled_date, opens_at, closes_at, finalized_at, cancelled_at, cancellation_reason',
                    )
                    .in(
                        'template_id',
                        ts.map((t) => t.id),
                    )
                    .eq('scheduled_date', today)
                    .is('cancelled_at', null)
                return rows ?? []
            }),
        )
    ).flat()

    // Lazy-finalize pending_close before composing the response. Apply
    // results locally — re-fetching gets stale data due to Next.js fetch
    // deduplication within a single render.
    const pending = pollRows.filter(
        (p) => getPollStatus(p) === 'pending_close',
    )
    if (pending.length > 0) {
        const results = await Promise.all(
            pending.map((p) =>
                finalizePoll(p.id).then((r) => ({ id: p.id, result: r })),
            ),
        )
        const now = new Date().toISOString()
        for (const { id, result } of results) {
            const i = pollRows.findIndex((x) => x.id === id)
            if (i < 0) continue
            if (result.status === 'finalized') {
                pollRows[i] = { ...pollRows[i], finalized_at: now }
            } else if (result.status === 'cancelled') {
                pollRows[i] = {
                    ...pollRows[i],
                    cancelled_at: now,
                    cancellation_reason: result.reason,
                }
            }
        }
    }

    const templatesById = new Map(templates.map((t) => [t.id, t]))
    const entries: DashboardEntry[] = []
    for (const poll of pollRows) {
        // A pending_close poll can flip to cancelled (no_votes) above; skip
        // those so the dashboard stays "live polls only".
        if (poll.cancelled_at) continue
        const template = templatesById.get(poll.template_id as string)
        if (!template) continue
        entries.push({
            template,
            poll,
            status: getPollStatus(poll),
        })
    }
    entries.sort((a, b) => a.template.name.localeCompare(b.template.name))
    return entries
}

export type FinalizeResult =
    | { status: 'noop' }
    | { status: 'cancelled'; reason: 'no_votes' }
    | { status: 'finalized'; winnerId: string }

/**
 * Finalize a poll that's past its close time. Idempotent.
 *
 * If no votes: cancels with reason 'no_votes'.
 * Otherwise: computes per-restaurant tally with the per-user banked-credit
 * rule (see docs/polls.md), picks a winner (random tiebreak), snapshots the
 * breakdown into poll_results, atomically claims the finalization, then
 * exercises the winner's contributing credits.
 *
 * Race safety: the atomic claim (UPDATE polls ... WHERE finalized_at IS NULL
 * RETURNING) ensures only one concurrent finalizer ever sets winner_id, so
 * tied tallies don't lead to two recorded winners. The exercise step that
 * follows is idempotent (filters exercised_at IS NULL).
 */
export async function finalizePoll(pollId: string): Promise<FinalizeResult> {
    const admin = createAdminClient()

    const { data: poll } = await admin
        .from('polls')
        .select(
            'id, template_id, opens_at, closes_at, finalized_at, cancelled_at',
        )
        .eq('id', pollId)
        .maybeSingle()
    if (!poll) return { status: 'noop' }
    if (getPollStatus(poll) !== 'pending_close') return { status: 'noop' }

    const { data: ballot } = await admin
        .from('poll_options')
        .select('restaurant_id')
        .eq('poll_id', pollId)
    const ballotIds = (ballot ?? []).map((o) => o.restaurant_id as string)

    const { data: todayVotes } = await admin
        .from('votes')
        .select('user_id, restaurant_id, vote_weight')
        .eq('poll_id', pollId)

    if (!todayVotes || todayVotes.length === 0) {
        await admin
            .from('polls')
            .update({
                cancelled_at: new Date().toISOString(),
                cancellation_reason: 'no_votes',
            })
            .eq('id', pollId)
            .is('finalized_at', null)
            .is('cancelled_at', null)
        return { status: 'cancelled', reason: 'no_votes' }
    }

    // Group today's votes: restaurant_id -> Map<user_id, weight>
    const todayByRestaurant = new Map<string, Map<string, number>>()
    for (const v of todayVotes) {
        const r = v.restaurant_id as string
        const u = v.user_id as string
        if (!todayByRestaurant.has(r)) todayByRestaurant.set(r, new Map())
        const inner = todayByRestaurant.get(r)!
        inner.set(u, (inner.get(u) ?? 0) + Number(v.vote_weight))
    }

    // Pull all unexercised banked rows in this template for today's voters,
    // excluding cancelled-poll votes (those didn't really happen).
    const todayUsers = Array.from(
        new Set(todayVotes.map((v) => v.user_id as string)),
    )
    const { data: cancelledPollRows } = await admin
        .from('polls')
        .select('id')
        .eq('template_id', poll.template_id)
        .not('cancelled_at', 'is', null)
    const cancelledPollIds = new Set(
        (cancelledPollRows ?? []).map((p) => p.id as string),
    )

    const { data: bankedRows } = await admin
        .from('votes')
        .select('user_id, restaurant_id, vote_weight, poll_id')
        .eq('template_id', poll.template_id)
        .is('exercised_at', null)
        .in('user_id', todayUsers)
        .in('restaurant_id', ballotIds)

    // Map (restaurant, user) -> banked balance (excluding cancelled polls).
    const bankedByPair = new Map<string, number>()
    for (const b of bankedRows ?? []) {
        if (cancelledPollIds.has(b.poll_id as string)) continue
        const key = `${b.restaurant_id}|${b.user_id}`
        bankedByPair.set(
            key,
            (bankedByPair.get(key) ?? 0) + Number(b.vote_weight),
        )
    }

    // Compute today_votes, banked_boost, total_tally per ballot restaurant.
    type Tally = {
        restaurant_id: string
        today_votes: number
        banked_boost: number
        total_tally: number
    }
    const tallies: Tally[] = ballotIds.map((r) => {
        const todayUsersForR = todayByRestaurant.get(r)
        if (!todayUsersForR) {
            return {
                restaurant_id: r,
                today_votes: 0,
                banked_boost: 0,
                total_tally: 0,
            }
        }
        let today_votes = 0
        let banked_boost = 0
        for (const [u, w] of todayUsersForR) {
            today_votes += w
            // bankedByPair includes today's row itself; subtract today's
            // weight so banked_boost is purely "from past polls."
            const totalForPair = bankedByPair.get(`${r}|${u}`) ?? w
            banked_boost += totalForPair - w
        }
        return {
            restaurant_id: r,
            today_votes,
            banked_boost,
            total_tally: today_votes + banked_boost,
        }
    })

    // Snapshot breakdown into poll_results before claiming the poll.
    // If we lose the claim race, this insert might collide — it's fine,
    // the winning finalizer's snapshot is already there.
    await admin.from('poll_results').upsert(
        tallies.map((t) => ({
            poll_id: pollId,
            restaurant_id: t.restaurant_id,
            today_votes: t.today_votes,
            banked_boost: t.banked_boost,
            total_tally: t.total_tally,
        })),
        { onConflict: 'poll_id,restaurant_id', ignoreDuplicates: true },
    )

    // Pick winner with random tiebreak.
    const maxTally = Math.max(...tallies.map((t) => t.total_tally))
    const ties = tallies.filter((t) => t.total_tally === maxTally)
    const winner = ties[Math.floor(Math.random() * ties.length)]

    // Atomically claim the finalization. Whoever wins this UPDATE owns
    // exercising the credits.
    const { data: claimed } = await admin
        .from('polls')
        .update({
            finalized_at: new Date().toISOString(),
            winner_id: winner.restaurant_id,
        })
        .eq('id', pollId)
        .is('finalized_at', null)
        .is('cancelled_at', null)
        .select('id')
        .maybeSingle()

    if (!claimed) return { status: 'noop' }

    // Exercise the winner's contributing credits.
    const winnerVoters = Array.from(
        todayByRestaurant.get(winner.restaurant_id)?.keys() ?? [],
    )
    if (winnerVoters.length > 0) {
        await admin
            .from('votes')
            .update({
                exercised_at: new Date().toISOString(),
                exercised_poll_id: pollId,
            })
            .eq('template_id', poll.template_id)
            .eq('restaurant_id', winner.restaurant_id)
            .in('user_id', winnerVoters)
            .is('exercised_at', null)
    }

    return { status: 'finalized', winnerId: winner.restaurant_id }
}

export type CancelResult = { status: 'ok' } | { status: 'noop' }

/**
 * Admin-cancel a poll. Works on any non-cancelled state:
 *   - scheduled: just marks cancelled; no votes to unwind
 *   - open: marks cancelled; votes stay in place but are excluded from
 *     banking queries via the poll.cancelled_at join filter
 *   - closed (finalized): marks cancelled, clears finalized_at/winner_id,
 *     and un-exercises any votes that this poll had exercised so those
 *     users' banked credits come back
 *
 * Always deletes daily_participation rows for (template, scheduled_date)
 * so affected users can participate in a re-instantiated poll.
 *
 * Race safety: the UPDATE requires cancelled_at IS NULL, so only one
 * concurrent canceller ever runs the unwind.
 */
export async function cancelPoll(
    pollId: string,
    adminUserId: string,
): Promise<CancelResult> {
    const admin = createAdminClient()

    const { data: claimed } = await admin
        .from('polls')
        .update({
            cancelled_at: new Date().toISOString(),
            cancellation_reason: 'admin',
            cancelled_by: adminUserId,
            finalized_at: null,
            winner_id: null,
        })
        .eq('id', pollId)
        .is('cancelled_at', null)
        .select('id, template_id, scheduled_date')
        .maybeSingle()

    if (!claimed) return { status: 'noop' }

    await admin
        .from('votes')
        .update({ exercised_at: null, exercised_poll_id: null })
        .eq('exercised_poll_id', pollId)

    await admin
        .from('daily_participation')
        .delete()
        .eq('template_id', claimed.template_id)
        .eq('scheduled_date', claimed.scheduled_date)

    return { status: 'ok' }
}
