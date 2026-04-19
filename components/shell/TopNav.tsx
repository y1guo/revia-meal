'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Brand } from './Brand'

type NavLink = {
    href: string
    label: string
}

const PRIMARY: NavLink[] = [
    { href: '/', label: 'Today' },
    { href: '/history', label: 'History' },
    { href: '/people', label: 'People' },
    { href: '/docs', label: 'Docs' },
]

function isActive(pathname: string, href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
}

type TopNavProps = {
    isAdmin: boolean
    avatarMenu: ReactNode
}

export function TopNav({ isAdmin, avatarMenu }: TopNavProps) {
    const pathname = usePathname() ?? '/'
    return (
        <header
            className={cn(
                'sticky top-0 z-30',
                'bg-[color:var(--surface-base)]/80 backdrop-blur-[8px]',
                'border-b border-[color:var(--border-subtle)]',
            )}
        >
            <div
                className={cn(
                    'mx-auto flex h-16 items-center gap-6',
                    'px-4 md:px-6 2xl:px-8',
                )}
            >
                <Brand />
                <nav
                    aria-label="Primary"
                    className="hidden md:flex items-center gap-1"
                >
                    {PRIMARY.map((link) => {
                        const active = isActive(pathname, link.href)
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'relative inline-flex items-center h-16 px-3',
                                    'text-[0.875rem] font-medium',
                                    'transition-colors duration-150',
                                    active
                                        ? 'text-[color:var(--text-primary)]'
                                        : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]',
                                )}
                            >
                                {link.label}
                                {active && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute bottom-0 left-3 right-3 h-[2px] bg-[color:var(--accent-brand)] rounded-full"
                                    />
                                )}
                            </Link>
                        )
                    })}
                </nav>
                <div className="ml-auto flex items-center gap-3">
                    {isAdmin && (
                        <>
                            <Link
                                href="/admin"
                                aria-current={
                                    isActive(pathname, '/admin')
                                        ? 'page'
                                        : undefined
                                }
                                className={cn(
                                    'hidden md:inline-flex items-center h-8 px-3 rounded-[var(--radius-md)]',
                                    'text-[0.8125rem] font-medium',
                                    'border border-[color:var(--border-subtle)]',
                                    'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--surface-raised)]',
                                    'transition-colors duration-150',
                                    isActive(pathname, '/admin') &&
                                        'text-[color:var(--text-primary)] bg-[color:var(--surface-raised)]',
                                )}
                            >
                                Admin
                            </Link>
                            <div
                                aria-hidden="true"
                                className="hidden md:block h-5 w-px bg-[color:var(--border-subtle)]"
                            />
                        </>
                    )}
                    {avatarMenu}
                </div>
            </div>
        </header>
    )
}
