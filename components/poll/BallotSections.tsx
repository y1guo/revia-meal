'use client'

import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'

const SECTION_HEADER_CLASS =
    'px-4 pt-4 pb-1 md:px-5 text-[0.75rem] font-medium uppercase tracking-wide text-[color:var(--text-secondary)]'
const LIST_CLASS = 'divide-y divide-[color:var(--border-subtle)]'

/**
 * Shared ballot list shell. With no favorites it renders a single flat list
 * (current behavior). With favorites it pins a "Favorites" section on top,
 * followed by "All restaurants" (omitted when every item is favorited). Both
 * ballots pass their own `renderRow` so the row markup stays identical.
 */
export function BallotSections<T extends { id: string }>({
    favorites,
    rest,
    renderRow,
}: {
    favorites: T[]
    rest: T[]
    renderRow: (item: T) => ReactNode
}) {
    if (favorites.length === 0) {
        return (
            <Card className="p-0 overflow-hidden">
                <ul className={LIST_CLASS}>{rest.map(renderRow)}</ul>
            </Card>
        )
    }
    return (
        <Card className="p-0 overflow-hidden">
            <section>
                <h3 className={SECTION_HEADER_CLASS}>Favorites</h3>
                <ul className={LIST_CLASS}>{favorites.map(renderRow)}</ul>
            </section>
            {rest.length > 0 && (
                <section>
                    <h3 className={SECTION_HEADER_CLASS}>All restaurants</h3>
                    <ul className={LIST_CLASS}>{rest.map(renderRow)}</ul>
                </section>
            )}
        </Card>
    )
}
