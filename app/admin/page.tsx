import type { Metadata } from 'next'
import Link from 'next/link'
import {
    CalendarClock,
    Store,
    UserCog,
    Vote,
    type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/shell/PageHeader'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'Admin' }

type Stat = {
    label: string
    value: number | string
    sub?: string
}

type QuickLink = {
    href: string
    label: string
    description: string
    icon: LucideIcon
}

const QUICK_LINKS: QuickLink[] = [
    {
        href: '/admin/users',
        label: 'Users',
        description: 'Allowlist, roles, active / inactive.',
        icon: UserCog,
    },
    {
        href: '/admin/restaurants',
        label: 'Restaurants',
        description: 'Shared catalog shared across templates.',
        icon: Store,
    },
    {
        href: '/admin/templates',
        label: 'Templates',
        description: 'Schedules and assigned restaurants.',
        icon: CalendarClock,
    },
    {
        href: '/admin/polls',
        label: 'Polls',
        description: 'Past and upcoming instances. Cancel here.',
        icon: Vote,
    },
]

export default async function AdminHome() {
    const admin = createAdminClient()
    const last30Start = new Date()
    last30Start.setDate(last30Start.getDate() - 30)
    const last30Iso = last30Start.toISOString()

    const [usersRes, templatesRes, restaurantsRes, cancelsRes] =
        await Promise.all([
            admin
                .from('users')
                .select('id', { count: 'exact', head: true })
                .eq('is_active', true),
            admin
                .from('poll_templates')
                .select('id', { count: 'exact', head: true })
                .eq('active', true),
            admin
                .from('restaurants')
                .select('id', { count: 'exact', head: true })
                .eq('active', true),
            admin
                .from('polls')
                .select('id', { count: 'exact', head: true })
                .not('cancelled_at', 'is', null)
                .gte('cancelled_at', last30Iso),
        ])

    const stats: Stat[] = [
        { label: 'people', value: usersRes.count ?? 0, sub: 'active' },
        {
            label: 'templates',
            value: templatesRes.count ?? 0,
            sub: 'active',
        },
        {
            label: 'restaurants',
            value: restaurantsRes.count ?? 0,
            sub: 'active',
        },
        {
            label: 'cancellations',
            value: cancelsRes.count ?? 0,
            sub: 'last 30d',
        },
    ]

    return (
        <>
            <PageHeader
                title="Admin"
                subtitle="Curate the allowlist, catalog, and schedule."
            />

            <section
                aria-label="Stats"
                className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-8"
            >
                {stats.map((stat) => (
                    <Card key={stat.label} className="space-y-0.5">
                        <div className="font-mono tabular-nums text-[1.75rem] font-semibold text-[color:var(--text-primary)] leading-none">
                            {stat.value}
                        </div>
                        <div className="text-[0.8125rem] text-[color:var(--text-secondary)]">
                            {stat.label}
                        </div>
                        {stat.sub && (
                            <div className="text-[0.6875rem] text-[color:var(--text-tertiary)]">
                                {stat.sub}
                            </div>
                        )}
                    </Card>
                ))}
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
                {QUICK_LINKS.map((link) => {
                    const Icon = link.icon
                    return (
                        <Link key={link.href} href={link.href} className="block">
                            <Card
                                interactive
                                className="flex items-start gap-3"
                            >
                                <span
                                    className={cn(
                                        'inline-flex h-10 w-10 items-center justify-center shrink-0',
                                        'rounded-[var(--radius-md)]',
                                        'bg-[color:var(--accent-brand)]/10 text-[color:var(--accent-brand)]',
                                    )}
                                    aria-hidden="true"
                                >
                                    <Icon size={20} strokeWidth={1.75} />
                                </span>
                                <div className="min-w-0">
                                    <div className="font-display font-medium text-[1rem] text-[color:var(--text-primary)]">
                                        {link.label}
                                    </div>
                                    <div className="text-[0.8125rem] text-[color:var(--text-secondary)]">
                                        {link.description}
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    )
                })}
            </section>
        </>
    )
}
