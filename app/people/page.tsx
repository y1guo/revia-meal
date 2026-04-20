import { Coffee, RotateCcw } from 'lucide-react'
import type { Metadata } from 'next'
import { signOut } from '@/app/actions'
import { AppShell } from '@/components/shell/AppShell'
import { PageHeader } from '@/components/shell/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DateRangeField } from '@/components/ui/DateRangeField'
import { EmptyState } from '@/components/ui/EmptyState'
import {
    FlavorBar,
    type FlavorSegment,
} from '@/components/ui/FlavorBar'
import { LinkButton } from '@/components/ui/LinkButton'
import { cn } from '@/lib/cn'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { selectUsersWithAvatar } from '@/lib/users'

export const metadata: Metadata = { title: 'People' }

type SearchParams = Promise<{ from?: string; to?: string }>

function defaultRange(): { from: string; to: string } {
    const today = new Date()
    const from = new Date(today)
    from.setDate(today.getDate() - 30)
    return {
        from: toISODate(from),
        to: toISODate(today),
    }
}

function toISODate(d: Date): string {
    return d.toLocaleDateString('en-CA')
}

export default async function PeoplePage({
    searchParams,
}: {
    searchParams: SearchParams
}) {
    const user = await requireUser()
    const params = await searchParams
    const { from: defaultFrom, to: defaultTo } = defaultRange()
    const from = params.from || defaultFrom
    const to = params.to || defaultTo

    const admin = createAdminClient()
    const [votesRes, usersRes, restaurantsRes] = await Promise.all([
        admin
            .from('votes')
            .select('user_id, restaurant_id, vote_weight, scheduled_date')
            .gte('scheduled_date', from)
            .lte('scheduled_date', to),
        selectUsersWithAvatar(admin),
        admin.from('restaurants').select('id, name'),
    ])

    const userMap = new Map(
        (usersRes.data ?? []).map((u) => [
            u.id,
            {
                display_name: u.display_name,
                email: u.email,
                avatar_url: u.avatar_url,
            },
        ]),
    )
    const restaurantMap = new Map(
        (restaurantsRes.data ?? []).map((r) => [
            r.id as string,
            r.name as string,
        ]),
    )

    type Agg = { weight: number; polls: number }
    const perUser = new Map<string, Map<string, Agg>>()
    const datesByUser = new Map<string, Set<string>>()
    const officeAgg = new Map<string, Agg>()

    for (const v of votesRes.data ?? []) {
        const uid = v.user_id as string
        const rid = v.restaurant_id as string
        const weight = Number(v.vote_weight)
        const date = v.scheduled_date as string

        if (!perUser.has(uid)) perUser.set(uid, new Map())
        const inner = perUser.get(uid)!
        if (!inner.has(rid)) inner.set(rid, { weight: 0, polls: 0 })
        const agg = inner.get(rid)!
        agg.weight += weight
        agg.polls += 1

        if (!datesByUser.has(uid)) datesByUser.set(uid, new Set())
        datesByUser.get(uid)!.add(date)

        if (!officeAgg.has(rid)) officeAgg.set(rid, { weight: 0, polls: 0 })
        const oa = officeAgg.get(rid)!
        oa.weight += weight
        oa.polls += 1
    }

    const officeSegments: FlavorSegment[] = Array.from(officeAgg.entries())
        .map(([rid, a]) => ({
            restaurantId: rid,
            restaurantName: restaurantMap.get(rid) ?? '(removed)',
            weight: a.weight,
            polls: a.polls,
        }))
        .sort((a, b) => b.weight - a.weight)

    const officeTotals = {
        people: perUser.size,
        polls: Array.from(datesByUser.values()).reduce(
            (s, set) => s + set.size,
            0,
        ),
        credits: officeSegments.reduce((s, seg) => s + seg.weight, 0),
    }

    const userRows = Array.from(perUser.entries())
        .map(([uid, agg]) => {
            const u = userMap.get(uid)
            if (!u) return null
            const segments: FlavorSegment[] = Array.from(agg.entries())
                .map(([rid, a]) => ({
                    restaurantId: rid,
                    restaurantName: restaurantMap.get(rid) ?? '(removed)',
                    weight: a.weight,
                    polls: a.polls,
                }))
                .sort((a, b) => b.weight - a.weight)
            return {
                userId: uid,
                displayName: u.display_name || u.email,
                email: u.email,
                avatarUrl: u.avatar_url,
                isMe: uid === user.id,
                segments,
                totalWeight: segments.reduce((s, seg) => s + seg.weight, 0),
                totalPolls: datesByUser.get(uid)?.size ?? 0,
            }
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => {
            if (a.isMe) return -1
            if (b.isMe) return 1
            return b.totalPolls - a.totalPolls
        })

    return (
        <AppShell
            user={user}
            signOutAction={signOut}
            maxWidthClassName="max-w-[1400px] 2xl:max-w-[1600px]"
        >
            <PageHeader
                title="People"
                subtitle="Everyone's flavor over the selected range, based on vote weights. Cancelled polls still represent what someone wanted that day."
            />

            <Card className="mb-6">
                <form className="flex flex-wrap items-end gap-3">
                    <DateRangeField from={from} to={to} label="Date range" />
                    <div className="ml-auto flex items-center gap-2">
                        <LinkButton
                            href="/people"
                            variant="ghost"
                            size="md"
                            leftIcon={RotateCcw}
                        >
                            Reset
                        </LinkButton>
                        <Button type="submit" variant="primary">
                            Apply
                        </Button>
                    </div>
                </form>
            </Card>

            {userRows.length === 0 ? (
                <EmptyState
                    icon={Coffee}
                    title="Nothing brewing in this range."
                    body={`No votes recorded between ${from} and ${to}. Widen the range to see more.`}
                />
            ) : (
                <div className="space-y-8">
                    <Card className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="font-display font-medium text-[1rem] text-[color:var(--text-primary)]">
                                The office
                            </h2>
                            <span className="text-[0.8125rem] font-mono tabular-nums text-[color:var(--text-secondary)]">
                                {officeTotals.people}{' '}
                                {officeTotals.people === 1 ? 'person' : 'people'}
                                {' · '}
                                {formatNum(officeTotals.credits)}{' '}
                                {officeTotals.credits === 1
                                    ? 'credit'
                                    : 'credits'}
                            </span>
                        </div>
                        <FlavorBar
                            segments={officeSegments}
                            height={40}
                            className="ring-1 ring-[color:var(--border-subtle)]"
                        />
                    </Card>

                    <div className="space-y-4">
                        {userRows.map((row) => (
                            <div key={row.userId} className="space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="inline-flex items-center gap-2 font-medium text-[color:var(--text-primary)]">
                                        <Avatar
                                            name={row.displayName}
                                            email={row.email}
                                            imageUrl={row.avatarUrl}
                                            size={28}
                                        />
                                        <span>
                                            {row.isMe ? (
                                                <>
                                                    {row.displayName}{' '}
                                                    <span className="text-[color:var(--text-secondary)] font-normal">
                                                        (You)
                                                    </span>
                                                </>
                                            ) : (
                                                row.displayName
                                            )}
                                        </span>
                                    </span>
                                    <span className="text-[0.8125rem] font-mono tabular-nums text-[color:var(--text-secondary)]">
                                        {row.totalPolls}{' '}
                                        {row.totalPolls === 1 ? 'poll' : 'polls'}
                                        {' · '}
                                        {formatNum(row.totalWeight)}{' '}
                                        {row.totalWeight === 1
                                            ? 'credit'
                                            : 'credits'}
                                    </span>
                                </div>
                                <FlavorBar
                                    segments={row.segments}
                                    className={cn(
                                        row.isMe &&
                                            'ring-2 ring-[color:var(--accent-brand)] ring-offset-2 ring-offset-[color:var(--surface-base)]',
                                    )}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </AppShell>
    )
}

function formatNum(n: number): string {
    return n.toFixed(2).replace(/\.?0+$/, '')
}
