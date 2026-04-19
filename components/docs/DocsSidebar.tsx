'use client'

import { Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

export type TocLeaf = { id: string; label: string }
export type TocSection = { id: string; label: string; children?: TocLeaf[] }
export type TocGroup = { heading: string; sections: TocSection[] }

type Props = { groups: TocGroup[] }

/**
 * Docs navigation. Desktop: sticky left sidebar with grouped headings,
 * indented children, and scroll-spy active state. Mobile: a "Jump to"
 * native select that scrolls the page to the chosen section.
 */
export function DocsSidebar({ groups }: Props) {
    const [activeId, setActiveId] = useState<string | null>(null)

    useEffect(() => {
        const allIds: string[] = []
        for (const g of groups) {
            for (const s of g.sections) {
                allIds.push(s.id)
                if (s.children) for (const c of s.children) allIds.push(c.id)
            }
        }
        const elements = allIds
            .map((id) => document.getElementById(id))
            .filter((el): el is HTMLElement => el !== null)

        // Track visible sections. The topmost one that is in view wins.
        const visible = new Set<string>()
        const observer = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (e.isIntersecting) visible.add(e.target.id)
                    else visible.delete(e.target.id)
                }
                // Pick the first id (in document order) that's visible
                for (const id of allIds) {
                    if (visible.has(id)) {
                        setActiveId(id)
                        break
                    }
                }
            },
            { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
        )
        for (const el of elements) observer.observe(el)
        return () => observer.disconnect()
    }, [groups])

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
                    value={activeId ?? ''}
                    onChange={(e) => {
                        const id = e.target.value
                        if (!id) return
                        const el = document.getElementById(id)
                        if (el) {
                            el.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                            })
                            history.replaceState(null, '', `#${id}`)
                        }
                    }}
                >
                    <option value="" disabled>
                        Select a section…
                    </option>
                    {groups.map((g) => (
                        <optgroup key={g.heading} label={g.heading}>
                            {g.sections.flatMap((s) => [
                                <option key={s.id} value={s.id}>
                                    {s.label}
                                </option>,
                                ...(s.children ?? []).map((c) => (
                                    <option key={c.id} value={c.id}>
                                        &nbsp;&nbsp;{c.label}
                                    </option>
                                )),
                            ])}
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
                <nav aria-label="Table of contents">
                    <ul className="space-y-7">
                        {groups.map((group) => (
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
                                    {group.sections.map((s) => {
                                        const activeChild =
                                            s.children?.some(
                                                (c) => c.id === activeId,
                                            ) ?? false
                                        const isActive =
                                            s.id === activeId || activeChild
                                        return (
                                            <li key={s.id}>
                                                <TocLink
                                                    href={`#${s.id}`}
                                                    active={s.id === activeId}
                                                    emphasized={isActive}
                                                    depth={0}
                                                >
                                                    {s.label}
                                                </TocLink>
                                                {s.children && (
                                                    <ul className="mt-0.5 space-y-0.5 border-l border-[color:var(--border-subtle)] ml-2.5">
                                                        {s.children.map(
                                                            (c) => (
                                                                <li key={c.id}>
                                                                    <TocLink
                                                                        href={`#${c.id}`}
                                                                        active={
                                                                            c.id ===
                                                                            activeId
                                                                        }
                                                                        emphasized={
                                                                            c.id ===
                                                                            activeId
                                                                        }
                                                                        depth={1}
                                                                    >
                                                                        {c.label}
                                                                    </TocLink>
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                )}
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

function TocLink({
    href,
    active,
    emphasized,
    depth,
    children,
}: {
    href: string
    active: boolean
    emphasized: boolean
    depth: number
    children: React.ReactNode
}) {
    return (
        <a
            href={href}
            className={cn(
                'block rounded-[var(--radius-sm)]',
                'text-[0.8125rem] leading-5',
                'px-2 py-1',
                'transition-colors duration-150',
                depth === 0 ? 'font-medium' : 'font-normal',
                depth === 1 && 'pl-3.5',
                active
                    ? 'bg-[color:var(--accent-brand)]/12 text-[color:var(--link-fg)]'
                    : emphasized
                      ? 'text-[color:var(--text-primary)]'
                      : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]',
            )}
        >
            {children}
        </a>
    )
}
