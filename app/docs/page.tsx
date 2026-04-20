import {
    KeyRound,
    Repeat2,
    Settings as SettingsIcon,
    Vote,
    type LucideIcon,
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { DocsPage } from '@/components/docs/DocsPage'
import { DocsPageHeader } from '@/components/docs/primitives'
import { cn } from '@/lib/cn'

export const metadata: Metadata = { title: 'Overview · Guide' }

type QuickCard = {
    href: string
    title: string
    description: string
    icon: LucideIcon
}

const QUICK_CARDS: QuickCard[] = [
    {
        href: '/docs/your-day',
        title: 'Voting & results',
        description: 'How to vote, what weights mean, and reading the tally.',
        icon: Vote,
    },
    {
        href: '/docs/rolling-credits',
        title: 'Rolling credits',
        description: 'The fairness mechanic — how banked credits work.',
        icon: Repeat2,
    },
    {
        href: '/docs/api-keys',
        title: 'API keys',
        description: 'Create a key, call the API, keep tokens safe.',
        icon: KeyRound,
    },
    {
        href: '/docs/for-admins',
        title: 'For admins',
        description: 'Allowlist, restaurants, templates, cancelling polls.',
        icon: SettingsIcon,
    },
]

export default function DocsOverview() {
    return (
        <DocsPage>
            <DocsPageHeader
                eyebrow="Getting started"
                title="Overview"
                lead="How HeyRevia Meal works, what banked credits are, and everything else you might want to know."
            />

            <p>
                HeyRevia Meal is an internal lunch-poll app. Every weekday
                morning a poll opens with a short list of restaurants. You
                vote for whichever ones sound good. At the close time, the
                app picks a winner, and someone places the group order based
                on that winner.
            </p>
            <p>
                The interesting part is what happens when your pick loses:
                your vote gets remembered as a{' '}
                <strong>banked credit</strong> for that restaurant, and
                boosts that restaurant in future polls you vote on. Over
                time, people who keep losing still get their turn.
            </p>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
                {QUICK_CARDS.map((c) => (
                    <Link
                        key={c.href}
                        href={c.href}
                        className={cn(
                            'group relative flex flex-col gap-2',
                            'rounded-[var(--radius-md)]',
                            'bg-[color:var(--surface-raised)]',
                            'border border-[color:var(--border-subtle)]',
                            'p-4 transition-colors duration-150',
                            'hover:border-[color:var(--accent-brand)]',
                            'no-underline',
                        )}
                    >
                        <span
                            className={cn(
                                'inline-flex h-9 w-9 items-center justify-center',
                                'rounded-[var(--radius-md)]',
                                'bg-[color:var(--accent-brand)]/12',
                                'text-[color:var(--link-fg)]',
                            )}
                            aria-hidden="true"
                        >
                            <c.icon size={18} strokeWidth={1.75} />
                        </span>
                        <div>
                            <div className="font-display font-medium text-[1rem] text-[color:var(--text-primary)] leading-tight">
                                {c.title}
                            </div>
                            <p className="mt-1 text-[0.8125rem] text-[color:var(--text-secondary)] leading-relaxed">
                                {c.description}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </DocsPage>
    )
}
