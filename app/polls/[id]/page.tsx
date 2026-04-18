import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPollStatus, type PollStatus } from '@/lib/polls'
import VoteForm, { type Ballot } from './vote-form'

type Params = Promise<{ id: string }>

type PollRow = {
    id: string
    template_id: string
    scheduled_date: string
    opens_at: string
    closes_at: string
    finalized_at: string | null
    cancelled_at: string | null
    cancellation_reason: string | null
    cancelled_by: string | null
    winner_id: string | null
}

type Restaurant = {
    id: string
    name: string
    doordash_url: string | null
    notes: string | null
}

export default async function PollPage({ params }: { params: Params }) {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    const { data: pollData } = await admin
        .from('polls')
        .select(
            'id, template_id, scheduled_date, opens_at, closes_at, finalized_at, cancelled_at, cancellation_reason, cancelled_by, winner_id',
        )
        .eq('id', id)
        .maybeSingle()

    if (!pollData) notFound()
    const poll = pollData as PollRow

    const [templateRes, optionsRes, votesRes, partRes] = await Promise.all([
        admin
            .from('poll_templates')
            .select('id, name, description')
            .eq('id', poll.template_id)
            .maybeSingle(),
        admin.from('poll_options').select('restaurant_id').eq('poll_id', id),
        admin
            .from('votes')
            .select('restaurant_id')
            .eq('poll_id', id)
            .eq('user_id', user.id),
        admin
            .from('daily_participation')
            .select('template_id')
            .eq('user_id', user.id)
            .eq('scheduled_date', poll.scheduled_date)
            .maybeSingle(),
    ])

    const template = templateRes.data
    const restaurantIds = (optionsRes.data ?? []).map((o) => o.restaurant_id)
    const { data: rData } =
        restaurantIds.length > 0
            ? await admin
                  .from('restaurants')
                  .select('id, name, doordash_url, notes')
                  .in('id', restaurantIds)
            : { data: [] as Restaurant[] }
    const restaurants = (rData ?? []) as Restaurant[]
    const initialPicks = (votesRes.data ?? []).map(
        (v) => v.restaurant_id as string,
    )
    const otherTemplateId =
        partRes.data && partRes.data.template_id !== poll.template_id
            ? partRes.data.template_id
            : null
    const otherTemplateName = otherTemplateId
        ? (
              await admin
                  .from('poll_templates')
                  .select('name')
                  .eq('id', otherTemplateId)
                  .maybeSingle()
          ).data?.name ?? null
        : null

    const status = getPollStatus(poll)

    return (
        <main className="p-8 space-y-6 max-w-3xl">
            <p className="text-sm">
                <Link href="/" className="underline">
                    ← Today&apos;s polls
                </Link>
            </p>
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold">
                    {template?.name ?? 'Poll'}
                </h1>
                <p className="text-sm text-neutral-500">
                    {formatDate(poll.scheduled_date)} ·{' '}
                    <StatusBadge status={status} />
                </p>
                {template?.description && (
                    <p className="text-sm text-neutral-500">
                        {template.description}
                    </p>
                )}
            </header>

            <StatusDetails poll={poll} status={status} />

            <section className="space-y-2">
                <h2 className="text-lg font-medium">
                    {status === 'open' ? 'Your vote' : 'Ballot'}
                </h2>
                {restaurants.length === 0 ? (
                    <p className="text-sm text-neutral-500">
                        No restaurants were on this poll&apos;s ballot.
                    </p>
                ) : status === 'open' && otherTemplateId ? (
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                        You&apos;ve already voted in
                        {otherTemplateName ? ` "${otherTemplateName}"` : ' another poll'}{' '}
                        today. You can only participate in one poll per day.
                    </p>
                ) : status === 'open' ? (
                    <VoteForm
                        pollId={poll.id}
                        ballot={restaurants.map(
                            (r): Ballot => ({
                                id: r.id,
                                name: r.name,
                                notes: r.notes,
                            }),
                        )}
                        initialPicks={initialPicks}
                    />
                ) : (
                    <ul className="border rounded-md divide-y">
                        {restaurants.map((r) => {
                            const voted = initialPicks.includes(r.id)
                            return (
                                <li key={r.id} className="p-3 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{r.name}</span>
                                        {voted && (
                                            <span className="text-xs rounded-full px-2 py-0.5 bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                                                you voted
                                            </span>
                                        )}
                                        {r.doordash_url && (
                                            <a
                                                href={r.doordash_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs underline text-neutral-500"
                                            >
                                                doordash
                                            </a>
                                        )}
                                    </div>
                                    {r.notes && (
                                        <p className="text-xs text-neutral-500">
                                            {r.notes}
                                        </p>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                )}
            </section>
        </main>
    )
}

function StatusDetails({ poll, status }: { poll: PollRow; status: PollStatus }) {
    switch (status) {
        case 'scheduled':
            return (
                <p className="text-sm">
                    This poll opens at{' '}
                    <strong>{formatDateTime(poll.opens_at)}</strong> and closes at{' '}
                    <strong>{formatDateTime(poll.closes_at)}</strong>.
                </p>
            )
        case 'open':
            return (
                <p className="text-sm">
                    Voting is <strong>open</strong>. Closes at{' '}
                    <strong>{formatDateTime(poll.closes_at)}</strong>.
                </p>
            )
        case 'pending_close':
            return (
                <p className="text-sm text-neutral-500">
                    The voting window has ended. Finalization will run on next visit
                    once that path is built.
                </p>
            )
        case 'closed':
            return (
                <p className="text-sm text-neutral-500">
                    This poll is closed. Results view is not implemented yet.
                </p>
            )
        case 'cancelled':
            return (
                <p className="text-sm text-red-600 dark:text-red-400">
                    This poll was cancelled
                    {poll.cancellation_reason === 'no_votes'
                        ? ' because no one voted.'
                        : ' by an admin.'}
                </p>
            )
    }
}

function formatDate(dateStr: string): string {
    // scheduled_date is `YYYY-MM-DD`; anchor to midnight UTC to avoid
    // off-by-one on tz rendering.
    return new Date(dateStr + 'T00:00:00Z').toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    })
}

function formatDateTime(isoString: string): string {
    return new Date(isoString).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    })
}

const STATUS_STYLES: Record<PollStatus, string> = {
    scheduled:
        'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200',
    open: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
    pending_close:
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
    closed:
        'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
    cancelled:
        'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
}

function StatusBadge({ status }: { status: PollStatus }) {
    return (
        <span
            className={`inline-block text-xs rounded-full px-2 py-0.5 ${STATUS_STYLES[status]}`}
        >
            {status.replace('_', ' ')}
        </span>
    )
}
