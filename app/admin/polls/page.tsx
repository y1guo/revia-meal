import { FilterX } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/shell/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DateRangeField } from '@/components/ui/DateRangeField'
import { EmptyState } from '@/components/ui/EmptyState'
import { LinkButton } from '@/components/ui/LinkButton'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPollStatus } from '@/lib/polls'
import CancelButton from './cancel-button'

export const metadata: Metadata = { title: 'Polls · Admin' }

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
    return {
        from: from.toLocaleDateString('en-CA'),
        to: today.toLocaleDateString('en-CA'),
    }
}

export default async function AdminPollsPage({
    searchParams,
}: {
    searchParams: SearchParams
}) {
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
            'id, template_id, scheduled_date, opens_at, closes_at, finalized_at, cancelled_at, cancellation_reason, cancelled_by, winner_id',
        )
        .gte('scheduled_date', from)
        .lte('scheduled_date', to)
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
    const userMap = new Map(
        (usersRes.data ?? []).map((u) => [
            u.id as string,
            {
                display_name: u.display_name as string | null,
                email: u.email as string,
            },
        ]),
    )

    return (
        <>
            <PageHeader
                title="Polls"
                subtitle="All poll instances in range. Cancel any poll to unwind its credit effects — scheduled, open, or closed alike."
            />

            <Card className="mb-6">
                <form className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
                    <FilterField label="Template">
                        <NativeSelect
                            name="template"
                            defaultValue={templateFilter}
                        >
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
                        <NativeSelect
                            name="status"
                            defaultValue={statusFilter}
                        >
                            <option value="">All</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="open">Open</option>
                            <option value="pending_close">Pending close</option>
                            <option value="closed">Closed</option>
                            <option value="cancelled">Cancelled</option>
                        </NativeSelect>
                    </FilterField>
                    <FilterField label="Winner">
                        <NativeSelect
                            name="winner"
                            defaultValue={winnerFilter}
                        >
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
                            href="/admin/polls"
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
                    body="Widen the date range or clear filters to see more."
                />
            ) : (
                <ul className="space-y-3">
                    {polls.map((p) => {
                        const status = getPollStatus(p)
                        const templateName =
                            templateMap.get(p.template_id as string) ??
                            '(removed template)'
                        const winnerName = p.winner_id
                            ? restaurantMap.get(p.winner_id as string) ??
                              '(removed)'
                            : null
                        const cancelledBy = p.cancelled_by
                            ? userMap.get(p.cancelled_by as string)
                            : null
                        const voters =
                            voterCountByPoll.get(p.id as string) ?? 0
                        const dateLabel = formatDate(
                            p.scheduled_date as string,
                        )
                        return (
                            <li key={p.id as string}>
                                <Card className="flex flex-wrap items-center gap-3">
                                    <div className="flex-1 min-w-[200px] space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Link
                                                href={`/polls/${p.id}`}
                                                className="font-medium text-[color:var(--text-primary)] hover:text-[color:var(--accent-brand)] transition-colors duration-150 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent-brand)]"
                                            >
                                                {templateName}
                                            </Link>
                                            <span className="text-[0.8125rem] text-[color:var(--text-secondary)] tabular-nums">
                                                {dateLabel}
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
                                                        : cancelledBy
                                                          ? `by ${cancelledBy.display_name || cancelledBy.email}`
                                                          : 'by admin'}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {status !== 'cancelled' && (
                                        <CancelButton
                                            pollId={p.id as string}
                                            label={`${templateName} — ${dateLabel}`}
                                            isClosed={status === 'closed'}
                                        />
                                    )}
                                </Card>
                            </li>
                        )
                    })}
                </ul>
            )}
        </>
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
