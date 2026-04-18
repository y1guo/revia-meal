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
 * Ensures today's poll exists for the given template and returns its id.
 * Returns null if:
 *   - template is inactive
 *   - today isn't in the template's days_of_week
 *   - an admin previously cancelled today's poll (don't auto-resurrect)
 *   - the schedule is invalid/incomplete
 */
export async function ensureTodaysPoll(
    template: Pick<TemplateRow, 'id' | 'schedule' | 'is_active'>,
): Promise<string | null> {
    if (!template.is_active) return null
    if (!shouldRunToday(template.schedule)) return null

    const { timezone, opens_at_local, closes_at_local } = template.schedule
    if (!timezone || !opens_at_local || !closes_at_local) return null

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
        opens_at: string
        closes_at: string
        finalized_at: string | null
        cancelled_at: string | null
        cancellation_reason: string | null
    }
    status: PollStatus
}

/**
 * Every active template that's scheduled to run today, with today's poll
 * (lazily instantiated if missing). Filters out templates that cancelled
 * today's poll or aren't scheduled today.
 */
export async function getTodaysDashboard(): Promise<DashboardEntry[]> {
    const admin = createAdminClient()
    const { data } = await admin
        .from('poll_templates')
        .select('id, name, description, schedule, is_active')
        .eq('is_active', true)
        .order('name')

    const templates = (data ?? []) as TemplateRow[]
    if (templates.length === 0) return []

    const pollIds = await Promise.all(
        templates.map((t) => ensureTodaysPoll(t)),
    )

    const validPollIds = pollIds.filter((id): id is string => !!id)
    if (validPollIds.length === 0) return []

    const { data: polls } = await admin
        .from('polls')
        .select(
            'id, opens_at, closes_at, finalized_at, cancelled_at, cancellation_reason',
        )
        .in('id', validPollIds)

    const pollMap = new Map((polls ?? []).map((p) => [p.id, p]))

    const entries: DashboardEntry[] = []
    templates.forEach((template, i) => {
        const pollId = pollIds[i]
        if (!pollId) return
        const poll = pollMap.get(pollId)
        if (!poll) return
        entries.push({
            template,
            poll,
            status: getPollStatus(poll),
        })
    })
    return entries
}
