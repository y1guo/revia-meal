'use client'

import { useState } from 'react'
import { BallotRow, BallotRowExpand } from '@/components/poll/BallotRow'
import { BallotSections } from '@/components/poll/BallotSections'
import { partitionFavorites } from '@/components/poll/partitionFavorites'
import { useFavorites } from '@/components/poll/useFavorites'
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
    /** Enables the bookmark toggle + Favorites-at-top grouping (scheduled polls only). */
    enableFavorites?: boolean
    initialFavoriteIds?: string[]
}

/**
 * Read-only ballot view, used for scheduled and cancelled polls.
 * Composed out of the shared <BallotRow>; does not accept votes. When
 * `enableFavorites` is set (scheduled polls), each row gains a bookmark toggle
 * and favorites are pinned to the top.
 */
export function BallotPreviewList({
    restaurants,
    userPickIds,
    showYouVoted,
    enableFavorites,
    initialFavoriteIds,
}: Props) {
    const pickSet = new Set(userPickIds)
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    // Hook is always called (rules of hooks); favorites only surface when enabled.
    const { favorites, toggle } = useFavorites(initialFavoriteIds ?? [])

    const toggleExpand = (id: string) => {
        setExpanded((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    function renderRow(r: BallotPreviewItem) {
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
                    isFavorite={enableFavorites && favorites.has(r.id)}
                    onToggleFavorite={
                        enableFavorites ? () => toggle(r.id) : undefined
                    }
                    nameSuffix={
                        voted ? (
                            <Chip variant="neutral">you voted</Chip>
                        ) : undefined
                    }
                    muted={r.disabled}
                    expanded={isExpanded}
                    onToggleExpanded={() => toggleExpand(r.id)}
                    rowId={rowId}
                />
                {isExpanded && r.rich_content && (
                    <BallotRowExpand
                        name={r.name}
                        richContent={r.rich_content}
                        notes={r.notes}
                        rowId={rowId}
                    />
                )}
            </li>
        )
    }

    const { favorites: favRows, rest } = partitionFavorites(
        restaurants,
        enableFavorites ? favorites : new Set<string>(),
    )

    return (
        <BallotSections favorites={favRows} rest={rest} renderRow={renderRow} />
    )
}
