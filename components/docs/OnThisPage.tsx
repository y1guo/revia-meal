'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

export type OnThisPageItem = { id: string; label: string }

type Props = {
    items: OnThisPageItem[]
}

/**
 * Right rail that lists H3-anchor items on the current page. The item whose
 * section is currently in view is highlighted. Caller supplies the list
 * explicitly so it matches the SubSection ids the page actually rendered.
 */
export function OnThisPage({ items }: Props) {
    const [activeId, setActiveId] = useState<string | null>(null)

    useEffect(() => {
        if (items.length === 0) return

        const elements = items
            .map((it) => document.getElementById(it.id))
            .filter((el): el is HTMLElement => el !== null)

        const visible = new Set<string>()
        const observer = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (e.isIntersecting) visible.add(e.target.id)
                    else visible.delete(e.target.id)
                }
                for (const it of items) {
                    if (visible.has(it.id)) {
                        setActiveId(it.id)
                        break
                    }
                }
            },
            { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
        )
        for (const el of elements) observer.observe(el)
        return () => observer.disconnect()
    }, [items])

    if (items.length === 0) return null

    return (
        <aside
            className={cn(
                'hidden xl:block w-56 shrink-0',
                'sticky top-24 self-start',
                'max-h-[calc(100vh-8rem)] overflow-y-auto',
            )}
            aria-label="On this page"
        >
            <p
                className={cn(
                    'text-[0.6875rem] font-semibold',
                    'uppercase tracking-[0.08em]',
                    'text-[color:var(--text-tertiary)]',
                    'mb-3 px-2',
                )}
            >
                On this page
            </p>
            <ul className="space-y-0.5">
                {items.map((it) => {
                    const active = it.id === activeId
                    return (
                        <li key={it.id}>
                            <a
                                href={`#${it.id}`}
                                className={cn(
                                    'block rounded-[var(--radius-sm)]',
                                    'text-[0.8125rem] leading-5',
                                    'px-2 py-1',
                                    'transition-colors duration-150',
                                    active
                                        ? 'text-[color:var(--link-fg)] font-medium'
                                        : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]',
                                )}
                            >
                                {it.label}
                            </a>
                        </li>
                    )
                })}
            </ul>
        </aside>
    )
}
