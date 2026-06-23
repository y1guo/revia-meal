// Pure, display-only sorting for the open-poll ballot. Like ballot-grouping,
// this only reshapes render order — it never touches picks or persistence, so
// reordering rows is always safe.
//
// Generic over a minimal shape so this module stays in `lib/` without importing
// the `Ballot`/`OrderStats` types from `app/` or `components/` (which would
// invert the dependency direction).

/** Minimal slice of OrderStats this module needs; null daysAgo = never ordered. */
type OrderStatsLike = { timesOrdered: number; lastOrderedDaysAgo: number | null }

export type SortKey =
    | 'default'
    | 'times-desc'
    | 'times-asc'
    | 'last-recent'
    | 'last-oldest'

/** User-facing sort options, in menu order. `default` keeps the ballot's order. */
export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: 'default', label: 'Default order' },
    { value: 'times-desc', label: 'Times ordered (high to low)' },
    { value: 'times-asc', label: 'Times ordered (low to high)' },
    { value: 'last-recent', label: 'Last ordered (most recent)' },
    { value: 'last-oldest', label: 'Last ordered (oldest first)' },
]

function timesOf(id: string, statsById: Record<string, OrderStatsLike>): number {
    return statsById[id]?.timesOrdered ?? 0
}

function daysAgoOf(
    id: string,
    statsById: Record<string, OrderStatsLike>,
): number | null {
    return statsById[id]?.lastOrderedDaysAgo ?? null
}

/**
 * Compare two restaurants by last-ordered recency. Never-ordered restaurants
 * (null) always sort last, in both directions, since "no order history" has no
 * meaningful position on a recency axis. `recent` = most recently ordered first
 * (fewest days ago); `oldest` = least recently ordered first (most days ago).
 */
function compareLastOrdered(
    a: number | null,
    b: number | null,
    direction: 'recent' | 'oldest',
): number {
    if (a === null && b === null) return 0
    if (a === null) return 1
    if (b === null) return -1
    return direction === 'recent' ? a - b : b - a
}

/**
 * Return a new array sorted by the chosen key. Disabled ("Removed") restaurants
 * are always pushed to the bottom — they can't be picked anew, mirroring the
 * server's active-first ballot order — and are sorted among themselves by the
 * same key. Ties retain input order (Array.prototype.sort is stable), so the
 * server's alphabetical ordering shows through. `default` returns the input
 * untouched.
 */
export function sortBallot<T extends { id: string; disabled: boolean }>(
    items: T[],
    sortKey: SortKey,
    statsById: Record<string, OrderStatsLike>,
): T[] {
    if (sortKey === 'default') return items
    return [...items].sort((a, b) => {
        if (a.disabled !== b.disabled) return a.disabled ? 1 : -1
        switch (sortKey) {
            case 'times-desc':
                return timesOf(b.id, statsById) - timesOf(a.id, statsById)
            case 'times-asc':
                return timesOf(a.id, statsById) - timesOf(b.id, statsById)
            case 'last-recent':
                return compareLastOrdered(
                    daysAgoOf(a.id, statsById),
                    daysAgoOf(b.id, statsById),
                    'recent',
                )
            case 'last-oldest':
                return compareLastOrdered(
                    daysAgoOf(a.id, statsById),
                    daysAgoOf(b.id, statsById),
                    'oldest',
                )
        }
    })
}
