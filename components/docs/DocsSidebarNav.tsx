'use client'

import { Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/cn'
import { DOCS_NAV, docsHref } from './nav-config'

/**
 * Route-aware docs left sidebar. Group headings are plain labels; each link
 * navigates to its own page. Active page gets a highlighted pill. Mobile
 * gets a "Jump to" native select that routes on change.
 */
export function DocsSidebarNav() {
    const pathname = usePathname() ?? '/docs'
    const router = useRouter()

    return (
        <>
            {/* Mobile "Jump to" */}
            <div className="lg:hidden mb-6">
                <label
                    htmlFor="docs-jump-to"
                    className="flex items-center gap-2 text-[0.75rem] uppercase tracking-wider font-medium text-[color:var(--text-tertiary)] mb-1.5"
                >
                    <Menu size={12} strokeWidth={2} aria-hidden="true" />
                    Jump to
                </label>
                <select
                    id="docs-jump-to"
                    className={cn(
                        'w-full h-10 px-3 rounded-[var(--radius-md)]',
                        'bg-[color:var(--surface-raised)]',
                        'border border-[color:var(--border-subtle)]',
                        'text-[0.875rem] text-[color:var(--text-primary)]',
                        'focus:border-[color:var(--accent-brand)]',
                    )}
                    value={pathname}
                    onChange={(e) => {
                        const href = e.target.value
                        if (href && href !== pathname) router.push(href)
                    }}
                >
                    {DOCS_NAV.map((group) => (
                        <optgroup key={group.heading} label={group.heading}>
                            {group.links.map((l) => (
                                <option
                                    key={l.slug}
                                    value={docsHref(l.slug)}
                                >
                                    {l.label}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>

            {/* Desktop sidebar */}
            <aside
                className={cn(
                    'hidden lg:block w-64 shrink-0',
                    'sticky top-24 self-start',
                    'max-h-[calc(100vh-8rem)] overflow-y-auto',
                    'pr-2',
                )}
            >
                <nav aria-label="Docs sections">
                    <ul className="space-y-7">
                        {DOCS_NAV.map((group) => (
                            <li key={group.heading}>
                                <p
                                    className={cn(
                                        'text-[0.6875rem] font-semibold',
                                        'uppercase tracking-[0.08em]',
                                        'text-[color:var(--text-tertiary)]',
                                        'mb-2.5 px-2',
                                    )}
                                >
                                    {group.heading}
                                </p>
                                <ul className="space-y-0.5">
                                    {group.links.map((l) => {
                                        const href = docsHref(l.slug)
                                        const active = pathname === href
                                        return (
                                            <li key={l.slug}>
                                                <Link
                                                    href={href}
                                                    aria-current={
                                                        active ? 'page' : undefined
                                                    }
                                                    className={cn(
                                                        'block rounded-[var(--radius-sm)]',
                                                        'text-[0.8125rem] leading-5',
                                                        'px-2 py-1.5',
                                                        'transition-colors duration-150',
                                                        active
                                                            ? 'bg-[color:var(--accent-brand)]/12 text-[color:var(--link-fg)] font-medium'
                                                            : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--surface-raised)]',
                                                    )}
                                                >
                                                    {l.label}
                                                </Link>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>
        </>
    )
}
