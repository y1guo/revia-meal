'use client'

import { useState } from 'react'
import { BallotRow, BallotRowExpand } from '@/components/poll/BallotRow'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import type { RichContent } from '@/lib/rich-content'

export type BallotPreviewItem = {
    id: string
    name: string
    doordash_url: string | null
    notes: string | null
    rich_content: RichContent | null
    disabled: boolean
}

type Props = {
    restaurants: BallotPreviewItem[]
    userPickIds: string[]
    showYouVoted: boolean
}

/**
 * Read-only ballot view, used for scheduled and cancelled polls.
 * Composed out of the shared <BallotRow>; does not accept votes.
 */
export function BallotPreviewList({
    restaurants,
    userPickIds,
    showYouVoted,
}: Props) {
    const pickSet = new Set(userPickIds)
    const [expanded, setExpanded] = useState<Set<string>>(new Set())

    const toggle = (id: string) => {
        setExpanded((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    return (
        <Card className="p-0 overflow-hidden">
            <ul className="divide-y divide-[color:var(--border-subtle)]">
                {restaurants.map((r) => {
                    const voted = showYouVoted && pickSet.has(r.id)
                    const rowId = `preview-row-${r.id}`
                    const isExpanded = expanded.has(r.id)
                    return (
                        <li key={r.id}>
                            <BallotRow
                                name={r.name}
                                doordashUrl={r.doordash_url}
                                notes={r.notes}
                                richContent={r.rich_content}
                                nameSuffix={
                                    voted ? (
                                        <Chip variant="neutral">
                                            you voted
                                        </Chip>
                                    ) : undefined
                                }
                                muted={r.disabled}
                                expanded={isExpanded}
                                onToggleExpanded={() => toggle(r.id)}
                                rowId={rowId}
                            />
                            {isExpanded && r.rich_content && (
                                <BallotRowExpand
                                    richContent={r.rich_content}
                                    notes={r.notes}
                                    rowId={rowId}
                                />
                            )}
                        </li>
                    )
                })}
            </ul>
        </Card>
    )
}
