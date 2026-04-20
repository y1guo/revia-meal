'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/cn'

type AdminNavLink = {
    href: string
    label: string
}

const ADMIN_LINKS: AdminNavLink[] = [
    { href: '/admin', label: 'Overview' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/restaurants', label: 'Restaurants' },
    { href: '/admin/templates', label: 'Templates' },
    { href: '/admin/polls', label: 'Polls' },
]

function matchActive(pathname: string, href: string): boolean {
    if (href === '/admin') return pathname === '/admin'
    return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminSubNav() {
    const pathname = usePathname() ?? '/admin'
    const activeLink =
        ADMIN_LINKS.find((l) => matchActive(pathname, l.href)) ??
        ADMIN_LINKS[0]

    return (
        <>
            {/* Desktop segmented-control pill */}
            <nav
                aria-label="Admin"
                className={cn(
                    'hidden md:flex w-fit items-center gap-0.5',
                    'bg-[color:var(--surface-sunken)]',
                    'border border-[color:var(--border-subtle)]',
                    'rounded-full p-0.5 mb-6',
                )}
            >
                {ADMIN_LINKS.map((link) => {
                    const active = matchActive(pathname, link.href)
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'inline-flex items-center justify-center',
                                'h-8 px-3.5 rounded-full',
                                'text-[0.8125rem] font-medium leading-none',
                                'transition-colors duration-150',
                                active
                                    ? 'bg-[color:var(--surface-raised)] text-[color:var(--text-primary)] shadow-[var(--shadow-card-rest)]'
                                    : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]',
                            )}
                        >
                            {link.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Mobile dropdown */}
            <div className="md:hidden mb-4">
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                        className={cn(
                            'inline-flex items-center justify-between gap-2 w-full',
                            'h-10 px-3 rounded-[var(--radius-md)]',
                            'bg-[color:var(--surface-raised)]',
                            'border border-[color:var(--border-subtle)]',
                            'text-[0.875rem] font-medium text-[color:var(--text-primary)]',
                        )}
                    >
                        <span>Admin · {activeLink.label}</span>
                        <ChevronDown
                            size={16}
                            strokeWidth={1.75}
                            className="text-[color:var(--text-secondary)]"
                            aria-hidden="true"
                        />
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                        <DropdownMenu.Content
                            align="start"
                            sideOffset={4}
                            className={cn(
                                'z-40 min-w-[220px] p-1.5',
                                'bg-[color:var(--surface-raised)]',
                                'border border-[color:var(--border-subtle)]',
                                'rounded-[var(--radius-md)]',
                                'shadow-[var(--shadow-card-hover)]',
                            )}
                        >
                            {ADMIN_LINKS.map((link) => {
                                const active = matchActive(pathname, link.href)
                                return (
                                    <DropdownMenu.Item key={link.href} asChild>
                                        <Link
                                            href={link.href}
                                            className={cn(
                                                'block px-2 py-1.5 rounded-[var(--radius-sm)]',
                                                'text-[0.875rem]',
                                                'data-[highlighted]:bg-[color:var(--surface-sunken)]',
                                                'outline-none cursor-pointer',
                                                active
                                                    ? 'text-[color:var(--text-primary)] font-medium'
                                                    : 'text-[color:var(--text-secondary)]',
                                            )}
                                        >
                                            {link.label}
                                        </Link>
                                    </DropdownMenu.Item>
                                )
                            })}
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>
            </div>
        </>
    )
}
