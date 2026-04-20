import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Award, Loader2 } from 'lucide-react'
import { signOut } from '@/app/actions'
import { AppShell } from '@/components/shell/AppShell'
import { PageHeader } from '@/components/shell/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { SmartBackLink } from '@/components/ui/SmartBackLink'
import { OverrideBanner, type OverrideEntry } from './override-banner'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { CountUp } from '@/components/ui/CountUp'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/lib/cn'
import { requireUser } from '@/lib/auth'
import { formatDateTime } from '@/lib/format-time'
import { createAdminClient } from '@/lib/supabase/admin'
import { selectUsersWithAvatar } from '@/lib/users'
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
    disabled: boolean
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
    avatar_url: string | null
}

const POLL_SELECT =
    'id, template_id, scheduled_date, opens_at, closes_at, finalized_at, cancelled_at, cancellation_reason, cancelled_by, winner_id'

export async function generateMetadata({
    params,
}: {
    params: Params
}): Promise<Metadata> {
    const { id } = await params
    const admin = createAdminClient()
    const { data: poll } = await admin
        .from('polls')
        .select('scheduled_date, template_id')
        .eq('id', id)
        .maybeSingle()
    if (!poll) return { title: 'Poll' }
    const { data: template } = await admin
        .from('poll_templates')
        .select('name')
        .eq('id', poll.template_id)
        .maybeSingle()
    const name = template?.name ?? 'Poll'
    const date = new Date(
        (poll.scheduled_date as string) + 'T00:00:00Z',
    ).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    })
    return { title: `${name} · ${date}` }
}

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
        admin
            .from('poll_options')
            .select('restaurant_id, disabled_at')
            .eq('poll_id', id),
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
    const optionRows = (optionsRes.data ?? []) as {
        restaurant_id: string
        disabled_at: string | null
    }[]
    const disabledByRestaurant = new Map(
        optionRows.map((o) => [o.restaurant_id, o.disabled_at !== null]),
    )
    const restaurantIds = optionRows.map((o) => o.restaurant_id)
    const { data: rData } =
        restaurantIds.length > 0
            ? await admin
                  .from('restaurants')
                  .select('id, name, doordash_url, notes')
                  .in('id', restaurantIds)
            : {
                  data: [] as {
                      id: string
                      name: string
                      doordash_url: string | null
                      notes: string | null
                  }[],
              }
    const restaurants: Restaurant[] = (rData ?? [])
        .map((r) => ({
            id: r.id as string,
            name: r.name as string,
            doordash_url: r.doordash_url as string | null,
            notes: r.notes as string | null,
            disabled: disabledByRestaurant.get(r.id as string) ?? false,
        }))
        .sort((a, b) => {
            // Active first, disabled at the bottom, each subgroup alphabetical.
            if (a.disabled !== b.disabled) return a.disabled ? 1 : -1
            return a.name.localeCompare(b.name)
        })
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

    let closedTallies: ClosedTally[] = []
    let closedVoters: VoterPick[] = []
    let overrideEntries: OverrideEntry[] = []
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
        const voterRes =
            voterIds.length > 0
                ? await selectUsersWithAvatar(admin, voterIds)
                : null
        const userMap = new Map(
            (voterRes?.data ?? []).map((u) => [
                u.id,
                {
                    display_name: u.display_name,
                    email: u.email,
                    avatar_url: u.avatar_url,
                },
            ]),
        )
        closedVoters = (allVotesRes.data ?? []).map((v) => ({
            user_id: v.user_id as string,
            restaurant_id: v.restaurant_id as string,
            vote_weight: Number(v.vote_weight),
            display_name:
                userMap.get(v.user_id as string)?.display_name ?? null,
            email: userMap.get(v.user_id as string)?.email ?? '',
            avatar_url: userMap.get(v.user_id as string)?.avatar_url ?? null,
        }))

        if (status === 'closed') {
            const { data: overrideRows } = await admin
                .from('poll_overrides')
                .select(
                    'overridden_at, reason, old_winner_id, new_winner_id, overridden_by',
                )
                .eq('poll_id', id)
                .order('overridden_at', { ascending: false })

            if (overrideRows && overrideRows.length > 0) {
                const restaurantIdSet = new Set<string>()
                const adminIdSet = new Set<string>()
                for (const o of overrideRows) {
                    restaurantIdSet.add(o.old_winner_id as string)
                    restaurantIdSet.add(o.new_winner_id as string)
                    if (o.overridden_by) adminIdSet.add(o.overridden_by as string)
                }
                const [restaurantNameRes, adminNameRes] = await Promise.all([
                    admin
                        .from('restaurants')
                        .select('id, name')
                        .in('id', Array.from(restaurantIdSet)),
                    adminIdSet.size > 0
                        ? admin
                              .from('users')
                              .select('id, display_name, email')
                              .in('id', Array.from(adminIdSet))
                        : Promise.resolve({
                              data: [] as {
                                  id: string
                                  display_name: string | null
                                  email: string
                              }[],
                          }),
                ])
                const restaurantNames = new Map(
                    (restaurantNameRes.data ?? []).map((r) => [
                        r.id as string,
                        r.name as string,
                    ]),
                )
                const adminNames = new Map(
                    (adminNameRes.data ?? []).map((u) => [
                        u.id as string,
                        (u.display_name as string | null) || (u.email as string),
                    ]),
                )
                overrideEntries = overrideRows.map((o) => ({
                    overriddenAt: o.overridden_at as string,
                    overriddenByName: o.overridden_by
                        ? adminNames.get(o.overridden_by as string) ?? null
                        : null,
                    oldWinnerName:
                        restaurantNames.get(o.old_winner_id as string) ??
                        '(removed)',
                    newWinnerName:
                        restaurantNames.get(o.new_winner_id as string) ??
                        '(removed)',
                    reason: (o.reason as string | null) ?? null,
                }))
            }
        }
    }

    return (
        <AppShell
            user={user}
            signOutAction={signOut}
            maxWidthClassName="max-w-[880px]"
        >
            <SmartBackLink fallbackHref="/">Back</SmartBackLink>
            <PageHeader
                title={template?.name ?? 'Poll'}
                subtitle={
                    <span className="flex flex-wrap items-center gap-2">
                        <span>{formatDate(poll.scheduled_date)}</span>
                        <StatusBadge status={status} />
                    </span>
                }
            />
            {template?.description && (
                <p className="text-[0.875rem] text-[color:var(--text-secondary)] -mt-3 mb-6">
                    {template.description}
                </p>
            )}

            <StatusDetails poll={poll} status={status} />

            <section className="mt-6 space-y-4">
                {restaurants.length === 0 ? (
                    <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
                        No restaurants were on this poll&apos;s ballot.
                    </p>
                ) : status === 'open' && otherTemplateId ? (
                    <ConflictState templateName={otherTemplateName} />
                ) : status === 'open' ? (
                    <VoteForm
                        pollId={poll.id}
                        ballot={restaurants.map(
                            (r): Ballot => ({
                                id: r.id,
                                name: r.name,
                                notes: r.notes,
                                doordash_url: r.doordash_url,
                                disabled: r.disabled,
                            }),
                        )}
                        initialPicks={initialPicks}
                        bankedByRestaurant={Object.fromEntries(
                            userBankedByRestaurant,
                        )}
                    />
                ) : status === 'closed' ? (
                    <>
                        <OverrideBanner overrides={overrideEntries} />
                        <ClosedBreakdown
                            restaurants={restaurants}
                            tallies={closedTallies}
                            voters={closedVoters}
                            winnerId={poll.winner_id}
                            currentUserId={user.id}
                        />
                    </>
                ) : (
                    <BallotPreview
                        restaurants={restaurants}
                        userPickIds={initialPicks}
                        showYouVoted={status === 'cancelled'}
                    />
                )}
            </section>
        </AppShell>
    )
}

function ConflictState({ templateName }: { templateName: string | null }) {
    return (
        <Card className="text-center py-10">
            <div className="text-5xl mb-3" aria-hidden="true">
                📅
            </div>
            <h2 className="font-display font-medium text-[1.125rem] text-[color:var(--text-primary)] mb-2">
                You&apos;ve already voted in{' '}
                {templateName ? `"${templateName}"` : 'another poll'} today.
            </h2>
            <p className="text-[0.875rem] text-[color:var(--text-secondary)] max-w-[320px] mx-auto">
                You can only participate in one poll per day.
            </p>
        </Card>
    )
}

function BallotPreview({
    restaurants,
    userPickIds,
    showYouVoted,
}: {
    restaurants: Restaurant[]
    userPickIds: string[]
    showYouVoted: boolean
}) {
    const pickSet = new Set(userPickIds)
    return (
        <Card className="p-0 overflow-hidden">
            <ul className="divide-y divide-[color:var(--border-subtle)]">
                {restaurants.map((r) => {
                    const voted = showYouVoted && pickSet.has(r.id)
                    return (
                        <li key={r.id} className="px-4 py-3 md:px-5 md:py-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-[color:var(--text-primary)]">
                                    {r.name}
                                </span>
                                {voted && (
                                    <Chip variant="neutral">you voted</Chip>
                                )}
                                {r.doordash_url && (
                                    <a
                                        href={r.doordash_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[0.8125rem] font-medium text-[color:var(--link-fg)] hover:text-[color:var(--accent-brand)] transition-colors duration-150"
                                    >
                                        DoorDash ↗
                                    </a>
                                )}
                            </div>
                            {r.notes && (
                                <p className="mt-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
                                    {r.notes}
                                </p>
                            )}
                        </li>
                    )
                })}
            </ul>
        </Card>
    )
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
    const ordered = restaurants.slice().sort((a, b) => {
        const ta = tallyMap.get(a.id)?.total_tally ?? 0
        const tb = tallyMap.get(b.id)?.total_tally ?? 0
        if (tb !== ta) return tb - ta
        if (a.id === winnerId) return -1
        if (b.id === winnerId) return 1
        return 0
    })

    return (
        <div className="space-y-3">
            {ordered.map((r, idx) => {
                const t = tallyMap.get(r.id)
                const rVoters = votersByRestaurant.get(r.id) ?? []
                const isWinner = r.id === winnerId
                return (
                    <Card
                        key={r.id}
                        className={cn(
                            'p-4 md:p-5 space-y-3',
                            isWinner
                                ? 'animate-scale-pop border-2 border-[color:var(--accent-brand)]/40 bg-[color:var(--banked-bg)]'
                                : 'animate-fade-slide-up',
                        )}
                        style={
                            isWinner
                                ? undefined
                                : {
                                      animationDelay: `${300 + idx * 80}ms`,
                                  }
                        }
                    >
                        <div className="flex flex-wrap items-center gap-2">
                            {isWinner && (
                                <Award
                                    size={20}
                                    strokeWidth={1.75}
                                    className="text-[color:var(--accent-brand)]"
                                    aria-hidden="true"
                                />
                            )}
                            <h3
                                className={cn(
                                    'font-display font-medium',
                                    isWinner
                                        ? 'text-[1.125rem] text-[color:var(--text-primary)]'
                                        : 'text-[1rem] text-[color:var(--text-primary)]',
                                )}
                            >
                                {r.name}
                            </h3>
                            {r.doordash_url && (
                                <a
                                    href={r.doordash_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[0.8125rem] font-medium text-[color:var(--link-fg)] hover:text-[color:var(--accent-brand)] transition-colors duration-150"
                                >
                                    DoorDash ↗
                                </a>
                            )}
                        </div>
                        {r.notes && (
                            <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
                                {r.notes}
                            </p>
                        )}
                        {t ? (
                            <p className="text-[0.875rem] font-mono tabular-nums text-[color:var(--text-secondary)]">
                                today{' '}
                                <CountUp
                                    value={t.today_votes}
                                    delayMs={
                                        isWinner ? 500 : 400 + idx * 80
                                    }
                                />{' '}
                                + banked{' '}
                                <CountUp
                                    value={t.banked_boost}
                                    delayMs={
                                        isWinner ? 500 : 400 + idx * 80
                                    }
                                />{' '}
                                ={' '}
                                <span className="font-semibold text-[color:var(--text-primary)]">
                                    total{' '}
                                    <CountUp
                                        value={t.total_tally}
                                        delayMs={
                                            isWinner ? 500 : 400 + idx * 80
                                        }
                                    />
                                </span>
                            </p>
                        ) : (
                            <p className="text-[0.8125rem] text-[color:var(--text-tertiary)]">
                                no votes today
                            </p>
                        )}
                        {rVoters.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {rVoters.map((v) => {
                                    const isMe = v.user_id === currentUserId
                                    const name = isMe
                                        ? 'You'
                                        : v.display_name || v.email
                                    return (
                                        <VoterChip
                                            key={v.user_id}
                                            name={name}
                                            email={v.email}
                                            avatarUrl={v.avatar_url}
                                            weight={v.vote_weight}
                                            highlight={isMe}
                                        />
                                    )
                                })}
                            </div>
                        )}
                    </Card>
                )
            })}
        </div>
    )
}

function VoterChip({
    name,
    email,
    avatarUrl,
    weight,
    highlight,
}: {
    name: string
    email: string
    avatarUrl: string | null
    weight: number
    highlight: boolean
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5',
                'h-7 pl-1 pr-2 rounded-full',
                'bg-[color:var(--surface-sunken)]',
                'text-[0.75rem] font-medium text-[color:var(--text-primary)]',
                highlight &&
                    'ring-2 ring-[color:var(--accent-brand)] ring-offset-1 ring-offset-[color:var(--surface-raised)]',
            )}
        >
            <Avatar
                name={name === 'You' ? null : name}
                email={email}
                imageUrl={avatarUrl}
                size={20}
            />
            <span>{name}</span>
            <span className="font-mono tabular-nums text-[color:var(--text-secondary)]">
                ({formatNum(weight)})
            </span>
        </span>
    )
}

function StatusDetails({
    poll,
    status,
}: {
    poll: PollRow
    status: PollStatus
}) {
    switch (status) {
        case 'scheduled':
            return (
                <p className="text-[0.9375rem] text-[color:var(--text-primary)]">
                    Opens at{' '}
                    <strong className="font-medium">
                        {formatDateTime(poll.opens_at)}
                    </strong>{' '}
                    · closes at{' '}
                    <strong className="font-medium">
                        {formatDateTime(poll.closes_at)}
                    </strong>
                    .
                </p>
            )
        case 'open':
            return (
                <p className="font-display font-medium text-[1.125rem] text-[color:var(--text-primary)]">
                    Voting is{' '}
                    <span className="text-[color:var(--status-open-fg)]">
                        open
                    </span>
                    . Closes at{' '}
                    <span className="font-sans">
                        {formatDateTime(poll.closes_at)}
                    </span>
                    .
                </p>
            )
        case 'pending_close':
            return (
                <Card className="flex items-start gap-3 bg-[color:var(--status-pending-bg)] border-[color:var(--status-pending-fg)]/20">
                    <Loader2
                        size={20}
                        strokeWidth={1.75}
                        className="animate-spin mt-0.5 text-[color:var(--status-pending-fg)]"
                        aria-hidden="true"
                    />
                    <div className="space-y-1">
                        <p className="font-display font-medium text-[color:var(--text-primary)]">
                            Finalizing…
                        </p>
                        <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
                            The voting window ended a moment ago. Refresh in a
                            second — results are being tallied.
                        </p>
                    </div>
                </Card>
            )
        case 'closed':
            return (
                <p className="text-[0.9375rem] text-[color:var(--text-secondary)]">
                    Closed at{' '}
                    <span className="font-medium text-[color:var(--text-primary)]">
                        {formatDateTime(poll.closes_at)}
                    </span>
                    . Breakdown shows today&apos;s votes plus each voter&apos;s
                    banked credit contribution.
                </p>
            )
        case 'cancelled':
            return (
                <p className="text-[0.9375rem] text-[color:var(--status-cancelled-fg)]">
                    {poll.cancellation_reason === 'no_votes'
                        ? 'Cancelled because no one voted.'
                        : poll.cancellation_reason ===
                            'no_available_restaurants'
                          ? 'Cancelled because no restaurants were available.'
                          : 'Cancelled by an admin.'}
                </p>
            )
    }
}

function formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00Z').toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    })
}

function formatNum(n: number): string {
    return n.toFixed(2).replace(/\.?0+$/, '')
}
