import { UtensilsCrossed } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { PageHeader } from '@/components/shell/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getCurrentUser } from '@/lib/auth'
import { formatDate, formatTime } from '@/lib/format-time'
import { getTodaysDashboard, type PollStatus } from '@/lib/polls'
import { signOut } from './actions'

// Root-segment pages don't pick up the layout's title.template (that only
// applies to child segments), so write the absolute title here.
export const metadata: Metadata = {
    title: { absolute: 'Today · HeyRevia Meal' },
}

type PollEntry = Awaited<ReturnType<typeof getTodaysDashboard>>[number]

export default async function Home() {
    const user = await getCurrentUser()
    if (!user || !user.is_active) redirect('/login')

    const entries = await getTodaysDashboard()
    const todayLabel = formatDate(new Date(), {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    })

    return (
        <AppShell user={user} signOutAction={signOut}>
            <PageHeader title="Today's polls" subtitle={todayLabel} />
            {entries.length === 0 ? (
                <EmptyState
                    icon={UtensilsCrossed}
                    title="Nothing on the menu today."
                    body="No templates are scheduled for today. Ask an admin to activate one whose schedule includes today — or check back tomorrow."
                />
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {entries.map((entry, i) => (
                        <PollCard
                            key={entry.poll.id}
                            entry={entry}
                            index={i}
                        />
                    ))}
                </div>
            )}
        </AppShell>
    )
}

function PollCard({ entry, index }: { entry: PollEntry; index: number }) {
    const { template, poll, status } = entry
    return (
        <Link
            href={`/polls/${poll.id}`}
            className="block animate-fade-slide-up"
            style={{ animationDelay: `${index * 60}ms` }}
        >
            <Card
                interactive
                className="h-full flex flex-col gap-2"
            >
                <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display font-medium text-[1.125rem] text-[color:var(--text-primary)]">
                        {template.name}
                    </h3>
                    <StatusBadge status={status} />
                </div>
                <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
                    {subtitle(status, poll)}
                </p>
                {template.description && (
                    <p className="text-[0.8125rem] text-[color:var(--text-tertiary)]">
                        {template.description}
                    </p>
                )}
            </Card>
        </Link>
    )
}

function subtitle(
    status: PollStatus,
    poll: {
        opens_at: string
        closes_at: string
        cancellation_reason: string | null
    },
): string {
    const now = Date.now()
    switch (status) {
        case 'scheduled': {
            const opens = new Date(poll.opens_at)
            return `${relativeFrom(opens.getTime() - now, 'future', 'Opens')} · ${formatTime(poll.opens_at)}`
        }
        case 'open': {
            const closes = new Date(poll.closes_at)
            return `${relativeFrom(closes.getTime() - now, 'future', 'Closes')} · ${formatTime(poll.closes_at)}`
        }
        case 'pending_close':
            return 'Voting window ended — finalizing soon'
        case 'closed':
            return 'Closed'
        case 'cancelled':
            return poll.cancellation_reason === 'admin'
                ? 'Cancelled by admin'
                : poll.cancellation_reason === 'no_available_restaurants'
                  ? 'Cancelled (no restaurants available)'
                  : 'Cancelled (no votes)'
    }
}

function relativeFrom(
    deltaMs: number,
    direction: 'future' | 'past',
    verb: string,
): string {
    const abs = Math.abs(deltaMs)
    const minutes = Math.round(abs / 60_000)
    const hours = Math.round(abs / 3_600_000)
    if (direction === 'future') {
        if (minutes < 1) return `${verb} shortly`
        if (minutes < 60) return `${verb} in ${minutes}m`
        if (hours < 24) return `${verb} in ${hours}h`
        return `${verb} at`
    }
    if (minutes < 1) return `${verb} just now`
    if (minutes < 60) return `${verb} ${minutes}m ago`
    if (hours < 24) return `${verb} ${hours}h ago`
    return `${verb}`
}

