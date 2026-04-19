import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPollStatus } from '@/lib/polls'

type SearchParams = Promise<{
    template?: string
    from?: string
    to?: string
    status?: string
    winner?: string
    participant?: string
}>

type HistoryStatus = 'closed' | 'cancelled'

const STATUS_STYLES: Record<HistoryStatus, string> = {
    closed: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
}

function defaultRange(): { from: string; to: string } {
    const today = new Date()
    const from = new Date(today)
    from.setDate(today.getDate() - 30)
    return {
        from: from.toLocaleDateString('en-CA'),
        to: today.toLocaleDateString('en-CA'),
    }
}

export default async function HistoryPage({
    searchParams,
}: {
    searchParams: SearchParams
}) {
    await requireUser()
    const params = await searchParams
    const { from: defaultFrom, to: defaultTo } = defaultRange()
    const from = params.from || defaultFrom
    const to = params.to || defaultTo
    const templateFilter = params.template || ''
    const statusFilter = params.status || ''
    const winnerFilter = params.winner || ''
    const participantFilter = params.participant || ''

    const admin = createAdminClient()

    const [templatesRes, restaurantsRes, usersRes] = await Promise.all([
        admin.from('poll_templates').select('id, name').order('name'),
        admin.from('restaurants').select('id, name').order('name'),
        admin
            .from('users')
            .select('id, display_name, email')
            .order('email'),
    ])

    let pollsQuery = admin
        .from('polls')
        .select(
            'id, template_id, scheduled_date, opens_at, closes_at, finalized_at, cancelled_at, cancellation_reason, winner_id',
        )
        .gte('scheduled_date', from)
        .lte('scheduled_date', to)
        .or('finalized_at.not.is.null,cancelled_at.not.is.null')
        .order('scheduled_date', { ascending: false })
        .order('opens_at', { ascending: false })

    if (templateFilter) pollsQuery = pollsQuery.eq('template_id', templateFilter)
    if (winnerFilter) pollsQuery = pollsQuery.eq('winner_id', winnerFilter)

    if (participantFilter) {
        const { data: pRows } = await admin
            .from('votes')
            .select('poll_id')
            .eq('user_id', participantFilter)
            .gte('scheduled_date', from)
            .lte('scheduled_date', to)
        const participantPollIds = Array.from(
            new Set((pRows ?? []).map((r) => r.poll_id as string)),
        )
        // Sentinel UUID keeps the `.in()` filter well-formed when there are
        // no matches.
        pollsQuery = pollsQuery.in(
            'id',
            participantPollIds.length > 0
                ? participantPollIds
                : ['00000000-0000-0000-0000-000000000000'],
        )
    }

    const { data: pollsData } = await pollsQuery
    const allPolls = pollsData ?? []

    // Apply status filter (derived; only closed/cancelled reachable here).
    const polls = statusFilter
        ? allPolls.filter((p) => getPollStatus(p) === statusFilter)
        : allPolls

    const pollIds = polls.map((p) => p.id as string)
    const { data: voteRows } =
        pollIds.length > 0
            ? await admin
                  .from('votes')
                  .select('poll_id, user_id')
                  .in('poll_id', pollIds)
            : { data: [] as { poll_id: string; user_id: string }[] }
    const voterSets = new Map<string, Set<string>>()
    for (const v of voteRows ?? []) {
        const pid = v.poll_id as string
        if (!voterSets.has(pid)) voterSets.set(pid, new Set())
        voterSets.get(pid)!.add(v.user_id as string)
    }
    const voterCountByPoll = new Map(
        Array.from(voterSets.entries()).map(([pid, set]) => [pid, set.size]),
    )

    const templateMap = new Map(
        (templatesRes.data ?? []).map((t) => [t.id as string, t.name as string]),
    )
    const restaurantMap = new Map(
        (restaurantsRes.data ?? []).map((r) => [
            r.id as string,
            r.name as string,
        ]),
    )

    return (
        <main className="p-8 space-y-6 max-w-4xl">
            <p className="text-sm">
                <Link href="/" className="underline">
                    ← Today&apos;s polls
                </Link>
            </p>
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold">History</h1>
                <p className="text-sm text-neutral-500">
                    Past polls — closed or cancelled. Filter by template, date
                    range, winner, or participant.
                </p>
            </header>

            <form className="flex flex-wrap items-end gap-3">
                <label className="grid gap-1">
                    <span className="text-xs text-neutral-500">Template</span>
                    <select
                        name="template"
                        defaultValue={templateFilter}
                        className="border rounded-md px-2 py-1 bg-transparent min-w-32"
                    >
                        <option value="">All</option>
                        {(templatesRes.data ?? []).map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="grid gap-1">
                    <span className="text-xs text-neutral-500">From</span>
                    <input
                        type="date"
                        name="from"
                        defaultValue={from}
                        className="border rounded-md px-2 py-1 bg-transparent"
                    />
                </label>
                <label className="grid gap-1">
                    <span className="text-xs text-neutral-500">To</span>
                    <input
                        type="date"
                        name="to"
                        defaultValue={to}
                        className="border rounded-md px-2 py-1 bg-transparent"
                    />
                </label>
                <label className="grid gap-1">
                    <span className="text-xs text-neutral-500">Status</span>
                    <select
                        name="status"
                        defaultValue={statusFilter}
                        className="border rounded-md px-2 py-1 bg-transparent"
                    >
                        <option value="">All</option>
                        <option value="closed">Closed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </label>
                <label className="grid gap-1">
                    <span className="text-xs text-neutral-500">Winner</span>
                    <select
                        name="winner"
                        defaultValue={winnerFilter}
                        className="border rounded-md px-2 py-1 bg-transparent min-w-32"
                    >
                        <option value="">Any</option>
                        {(restaurantsRes.data ?? []).map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="grid gap-1">
                    <span className="text-xs text-neutral-500">Participant</span>
                    <select
                        name="participant"
                        defaultValue={participantFilter}
                        className="border rounded-md px-2 py-1 bg-transparent min-w-40"
                    >
                        <option value="">Anyone</option>
                        {(usersRes.data ?? []).map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.display_name || u.email}
                            </option>
                        ))}
                    </select>
                </label>
                <button
                    type="submit"
                    className="border rounded-md px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
                >
                    Apply
                </button>
            </form>

            {polls.length === 0 ? (
                <p className="text-sm text-neutral-500">
                    No polls match these filters.
                </p>
            ) : (
                <ul className="border rounded-md divide-y">
                    {polls.map((p) => {
                        const displayStatus: HistoryStatus =
                            getPollStatus(p) === 'cancelled'
                                ? 'cancelled'
                                : 'closed'
                        const templateName =
                            templateMap.get(p.template_id as string) ??
                            '(removed template)'
                        const winnerName = p.winner_id
                            ? restaurantMap.get(p.winner_id as string) ??
                              '(removed)'
                            : null
                        const voters =
                            voterCountByPoll.get(p.id as string) ?? 0
                        return (
                            <li key={p.id as string}>
                                <Link
                                    href={`/polls/${p.id}`}
                                    className="block p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 space-y-1"
                                >
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium">
                                            {templateName}
                                        </span>
                                        <span className="text-xs text-neutral-500 tabular-nums">
                                            {formatDate(
                                                p.scheduled_date as string,
                                            )}
                                        </span>
                                        <span
                                            className={`text-xs rounded-full px-2 py-0.5 ${STATUS_STYLES[displayStatus]}`}
                                        >
                                            {displayStatus}
                                        </span>
                                    </div>
                                    <div className="text-xs text-neutral-500">
                                        {voters}{' '}
                                        {voters === 1 ? 'voter' : 'voters'}
                                        {winnerName &&
                                            displayStatus === 'closed' && (
                                                <>
                                                    {' '}· winner:{' '}
                                                    <strong>
                                                        {winnerName}
                                                    </strong>
                                                </>
                                            )}
                                        {displayStatus === 'cancelled' && (
                                            <>
                                                {' '}·{' '}
                                                {p.cancellation_reason ===
                                                'no_votes'
                                                    ? 'no votes'
                                                    : 'cancelled by admin'}
                                            </>
                                        )}
                                    </div>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            )}
        </main>
    )
}

function formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00Z').toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    })
}
