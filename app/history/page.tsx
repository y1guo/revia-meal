import { FilterX } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { signOut } from '@/app/actions'
import { AppShell } from '@/components/shell/AppShell'
import { PageHeader } from '@/components/shell/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DateRangeField } from '@/components/ui/DateRangeField'
import { EmptyState } from '@/components/ui/EmptyState'
import { LinkButton } from '@/components/ui/LinkButton'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { requireUser } from '@/lib/auth'
import { toISODate } from '@/lib/format-time'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPollStatus } from '@/lib/polls'

export const metadata: Metadata = { title: 'History' }

type SearchParams = Promise<{
    template?: string
    from?: string
    to?: string
    status?: string
    winner?: string
    participant?: string
}>

function defaultRange(): { from: string; to: string } {
    const today = new Date()
    const from = new Date(today)
    from.setDate(today.getDate() - 30)
    return { from: toISODate(from), to: toISODate(today) }
}

export default async function HistoryPage({
    searchParams,
}: {
    searchParams: SearchParams
}) {
    const user = await requireUser()
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
        pollsQuery = pollsQuery.in(
            'id',
            participantPollIds.length > 0
                ? participantPollIds
                : ['00000000-0000-0000-0000-000000000000'],
        )
    }

    const { data: pollsData } = await pollsQuery
    const allPolls = pollsData ?? []

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
        <AppShell
            user={user}
            signOutAction={signOut}
            maxWidthClassName="max-w-[1200px] 2xl:max-w-[1400px]"
        >
            <PageHeader
                title="History"
                subtitle="Past polls — closed or cancelled. Filter by template, date, winner, or participant."
            />

            <Card className="mb-6">
                {/* Native <select> (styled) is used for "All"-style filters —
                    Radix Select reserves empty-string values and we rely on
                    them for GET-form "unset" semantics. */}
                <form className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
                    <FilterField label="Template">
                        <NativeSelect name="template" defaultValue={templateFilter}>
                            <option value="">All</option>
                            {(templatesRes.data ?? []).map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name}
                                </option>
                            ))}
                        </NativeSelect>
                    </FilterField>
                    <div className="md:col-span-2">
                        <DateRangeField
                            from={from}
                            to={to}
                            label="Date range"
                            className="w-full"
                        />
                    </div>
                    <FilterField label="Status">
                        <NativeSelect name="status" defaultValue={statusFilter}>
                            <option value="">All</option>
                            <option value="closed">Closed</option>
                            <option value="cancelled">Cancelled</option>
                        </NativeSelect>
                    </FilterField>
                    <FilterField label="Winner">
                        <NativeSelect name="winner" defaultValue={winnerFilter}>
                            <option value="">Any</option>
                            {(restaurantsRes.data ?? []).map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name}
                                </option>
                            ))}
                        </NativeSelect>
                    </FilterField>
                    <FilterField label="Participant">
                        <NativeSelect
                            name="participant"
                            defaultValue={participantFilter}
                        >
                            <option value="">Anyone</option>
                            {(usersRes.data ?? []).map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.display_name || u.email}
                                </option>
                            ))}
                        </NativeSelect>
                    </FilterField>
                    <div className="col-span-full flex items-center justify-end gap-2">
                        <LinkButton
                            href="/history"
                            variant="ghost"
                            size="md"
                            leftIcon={FilterX}
                        >
                            Clear filters
                        </LinkButton>
                        <Button type="submit" variant="primary">
                            Apply
                        </Button>
                    </div>
                </form>
            </Card>

            {polls.length === 0 ? (
                <EmptyState
                    icon={FilterX}
                    title="No polls match these filters."
                    body="Try widening the date range, or clear filters to start over."
                    action={
                        <LinkButton href="/history" variant="secondary">
                            Clear filters
                        </LinkButton>
                    }
                />
            ) : (
                <ul className="space-y-2 2xl:grid 2xl:grid-cols-2 2xl:gap-3 2xl:space-y-0">
                    {polls.map((p) => {
                        const status = getPollStatus(p)
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
                                    className="block"
                                >
                                    <Card interactive className="space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-medium text-[color:var(--text-primary)]">
                                                {templateName}
                                            </span>
                                            <span className="text-[0.8125rem] text-[color:var(--text-secondary)] tabular-nums">
                                                {formatDate(
                                                    p.scheduled_date as string,
                                                )}
                                            </span>
                                            <StatusBadge status={status} />
                                        </div>
                                        <div className="text-[0.8125rem] text-[color:var(--text-secondary)]">
                                            {voters}{' '}
                                            {voters === 1 ? 'voter' : 'voters'}
                                            {winnerName &&
                                                status === 'closed' && (
                                                    <>
                                                        {' '}· winner:{' '}
                                                        <strong className="text-[color:var(--text-primary)]">
                                                            {winnerName}
                                                        </strong>
                                                    </>
                                                )}
                                            {status === 'cancelled' && (
                                                <>
                                                    {' '}·{' '}
                                                    {p.cancellation_reason ===
                                                    'no_votes'
                                                        ? 'no votes'
                                                        : p.cancellation_reason ===
                                                            'no_available_restaurants'
                                                          ? 'no available restaurants'
                                                          : 'cancelled by admin'}
                                                </>
                                            )}
                                        </div>
                                    </Card>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            )}
        </AppShell>
    )
}

function FilterField({
    label,
    children,
}: {
    label: string
    children: React.ReactNode
}) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-[0.75rem] font-medium text-[color:var(--text-secondary)]">
                {label}
            </span>
            {children}
        </label>
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
