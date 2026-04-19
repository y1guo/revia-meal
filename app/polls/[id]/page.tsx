import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import {
    getPollStatus,
    finalizePoll,
    type PollStatus,
} from '@/lib/polls'
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

const POLL_SELECT =
    'id, template_id, scheduled_date, opens_at, closes_at, finalized_at, cancelled_at, cancellation_reason, cancelled_by, winner_id'

export default async function PollPage({ params }: { params: Params }) {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    const { data: initial } = await admin
        .from('polls')
        .select(POLL_SELECT)
        .eq('id', id)
        .maybeSingle()

    if (!initial) notFound()
    let poll = initial as PollRow

    // Lazy finalize on visit if the close window has elapsed. We don't re-
    // fetch the poll afterward — Next.js dedupes identical server fetches
    // within a single render, so the second read would return stale (pre-
    // finalize) data. Apply the finalize result locally instead.
    if (getPollStatus(poll) === 'pending_close') {
        const result = await finalizePoll(poll.id)
        const now = new Date().toISOString()
        if (result.status === 'finalized') {
            poll = { ...poll, finalized_at: now, winner_id: result.winnerId }
        } else if (result.status === 'cancelled') {
            poll = {
                ...poll,
                cancelled_at: now,
                cancellation_reason: result.reason,
            }
        }
    }

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

    // For Open view: user's own banked credits per restaurant in this template
    // (excluding any rows from this poll — those are today's vote, shown via
    // the checkbox state, not as "banked from prior polls"). Also exclude
    // cancelled-poll votes — those didn't really happen.
    const userBankedByRestaurant = new Map<string, number>()
    if (status === 'open' && restaurantIds.length > 0) {
        const { data: cancelledRows } = await admin
            .from('polls')
            .select('id')
            .eq('template_id', poll.template_id)
            .not('cancelled_at', 'is', null)
        const cancelledIds = new Set(
            (cancelledRows ?? []).map((p) => p.id as string),
        )

        const { data: bankedRows } = await admin
            .from('votes')
            .select('restaurant_id, vote_weight, poll_id')
            .eq('user_id', user.id)
            .eq('template_id', poll.template_id)
            .is('exercised_at', null)
            .neq('poll_id', poll.id)
            .in('restaurant_id', restaurantIds)
        for (const b of bankedRows ?? []) {
            if (cancelledIds.has(b.poll_id as string)) continue
            const r = b.restaurant_id as string
            userBankedByRestaurant.set(
                r,
                (userBankedByRestaurant.get(r) ?? 0) + Number(b.vote_weight),
            )
        }
    }

    // For Closed view: snapshotted breakdown + per-restaurant voter list.
    type ClosedTally = {
        restaurant_id: string
        today_votes: number
        banked_boost: number
        total_tally: number
    }
    type VoterPick = {
        user_id: string
        restaurant_id: string
        vote_weight: number
        display_name: string | null
        email: string
    }
    let closedTallies: ClosedTally[] = []
    let closedVoters: VoterPick[] = []
    if (status === 'closed' || status === 'cancelled') {
        const [resultsRes, allVotesRes] = await Promise.all([
            admin
                .from('poll_results')
                .select(
                    'restaurant_id, today_votes, banked_boost, total_tally',
                )
                .eq('poll_id', id),
            admin
                .from('votes')
                .select('user_id, restaurant_id, vote_weight')
                .eq('poll_id', id),
        ])
        closedTallies = (resultsRes.data ?? []).map((row) => ({
            restaurant_id: row.restaurant_id as string,
            today_votes: Number(row.today_votes),
            banked_boost: Number(row.banked_boost),
            total_tally: Number(row.total_tally),
        }))
        const voterIds = Array.from(
            new Set((allVotesRes.data ?? []).map((v) => v.user_id as string)),
        )
        const { data: voterRows } =
            voterIds.length > 0
                ? await admin
                      .from('users')
                      .select('id, display_name, email')
                      .in('id', voterIds)
                : { data: [] }
        const userMap = new Map(
            (voterRows ?? []).map((u) => [
                u.id as string,
                {
                    display_name: u.display_name as string | null,
                    email: u.email as string,
                },
            ]),
        )
        closedVoters = (allVotesRes.data ?? []).map((v) => ({
            user_id: v.user_id as string,
            restaurant_id: v.restaurant_id as string,
            vote_weight: Number(v.vote_weight),
            display_name: userMap.get(v.user_id as string)?.display_name ?? null,
            email: userMap.get(v.user_id as string)?.email ?? '',
        }))
    }

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
                        bankedByRestaurant={Object.fromEntries(
                            userBankedByRestaurant,
                        )}
                    />
                ) : status === 'closed' ? (
                    <ClosedBreakdown
                        restaurants={restaurants}
                        tallies={closedTallies}
                        voters={closedVoters}
                        winnerId={poll.winner_id}
                        currentUserId={user.id}
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

type ClosedTally = {
    restaurant_id: string
    today_votes: number
    banked_boost: number
    total_tally: number
}

type VoterPick = {
    user_id: string
    restaurant_id: string
    vote_weight: number
    display_name: string | null
    email: string
}

function ClosedBreakdown({
    restaurants,
    tallies,
    voters,
    winnerId,
    currentUserId,
}: {
    restaurants: Restaurant[]
    tallies: ClosedTally[]
    voters: VoterPick[]
    winnerId: string | null
    currentUserId: string
}) {
    const tallyMap = new Map(tallies.map((t) => [t.restaurant_id, t]))
    const votersByRestaurant = new Map<string, VoterPick[]>()
    for (const v of voters) {
        if (!votersByRestaurant.has(v.restaurant_id))
            votersByRestaurant.set(v.restaurant_id, [])
        votersByRestaurant.get(v.restaurant_id)!.push(v)
    }
    // Sort restaurants by total_tally desc, winner first on ties.
    const ordered = restaurants.slice().sort((a, b) => {
        const ta = tallyMap.get(a.id)?.total_tally ?? 0
        const tb = tallyMap.get(b.id)?.total_tally ?? 0
        if (tb !== ta) return tb - ta
        if (a.id === winnerId) return -1
        if (b.id === winnerId) return 1
        return 0
    })

    return (
        <ul className="border rounded-md divide-y">
            {ordered.map((r) => {
                const t = tallyMap.get(r.id)
                const rVoters = votersByRestaurant.get(r.id) ?? []
                const isWinner = r.id === winnerId
                return (
                    <li
                        key={r.id}
                        className={`p-3 space-y-2 ${
                            isWinner
                                ? 'bg-green-50 dark:bg-green-950'
                                : ''
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{r.name}</span>
                            {isWinner && (
                                <span className="text-xs rounded-full px-2 py-0.5 bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100">
                                    winner
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
                            <p className="text-xs text-neutral-500">{r.notes}</p>
                        )}
                        {t ? (
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 tabular-nums">
                                today {formatNum(t.today_votes)} +
                                banked {formatNum(t.banked_boost)} ={' '}
                                <strong>{formatNum(t.total_tally)}</strong>
                            </p>
                        ) : (
                            <p className="text-xs text-neutral-500">
                                No tally recorded.
                            </p>
                        )}
                        {rVoters.length > 0 ? (
                            <p className="text-xs text-neutral-500">
                                Voters:{' '}
                                {rVoters.map((v, i) => {
                                    const isMe = v.user_id === currentUserId
                                    const name = v.display_name || v.email
                                    return (
                                        <span key={v.user_id}>
                                            {i > 0 ? ', ' : ''}
                                            <span
                                                className={
                                                    isMe
                                                        ? 'font-medium text-neutral-700 dark:text-neutral-300'
                                                        : ''
                                                }
                                            >
                                                {name}
                                                {isMe ? ' (you)' : ''}
                                            </span>{' '}
                                            <span className="tabular-nums">
                                                ({formatNum(v.vote_weight)})
                                            </span>
                                        </span>
                                    )
                                })}
                            </p>
                        ) : (
                            <p className="text-xs text-neutral-500">
                                No votes today.
                            </p>
                        )}
                    </li>
                )
            })}
        </ul>
    )
}

function formatNum(n: number): string {
    return n.toFixed(2).replace(/\.?0+$/, '')
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
            // Should be rare — the page calls finalizePoll before rendering.
            // Could happen if finalize lost a race or hit a transient error.
            return (
                <p className="text-sm text-neutral-500">
                    The voting window has ended. Finalization is in progress —
                    refresh in a moment.
                </p>
            )
        case 'closed':
            return (
                <p className="text-sm text-neutral-500">
                    This poll closed at{' '}
                    <strong>{formatDateTime(poll.closes_at)}</strong>. The
                    breakdown below shows today&apos;s votes plus each voter&apos;s
                    banked credit contribution.
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
