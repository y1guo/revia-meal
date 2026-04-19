'use client'

import { BookOpen, History, Users, Utensils, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

type Tab = {
    href: string
    label: string
    icon: LucideIcon
}

const TABS: Tab[] = [
    { href: '/', label: 'Today', icon: Utensils },
    { href: '/history', label: 'History', icon: History },
    { href: '/people', label: 'People', icon: Users },
    { href: '/docs', label: 'Docs', icon: BookOpen },
]

function isActive(pathname: string, href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
}

export function BottomTabs() {
    const pathname = usePathname() ?? '/'
    return (
        <nav
            aria-label="Primary"
            className={cn(
                'fixed bottom-0 left-0 right-0 z-30 md:hidden',
                'bg-[color:var(--surface-base)]/95 backdrop-blur-[8px]',
                'border-t border-[color:var(--border-subtle)]',
                'pb-[env(safe-area-inset-bottom)]',
            )}
        >
            <ul className="grid grid-cols-4">
                {TABS.map((tab) => {
                    const active = isActive(pathname, tab.href)
                    const Icon = tab.icon
                    return (
                        <li key={tab.href}>
                            <Link
                                href={tab.href}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'flex flex-col items-center justify-center gap-0.5',
                                    'h-16',
                                    'transition-colors duration-150',
                                    active
                                        ? 'text-[color:var(--accent-brand)]'
                                        : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]',
                                )}
                            >
                                <Icon
                                    size={22}
                                    strokeWidth={active ? 2 : 1.75}
                                    aria-hidden="true"
                                />
                                <span className="text-[0.6875rem] leading-none font-medium">
                                    {tab.label}
                                </span>
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}
