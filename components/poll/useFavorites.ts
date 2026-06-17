'use client'

import { useState, useTransition } from 'react'
import { setFavoriteAction } from '@/lib/favorites-actions'

/**
 * Optimistic per-user favorites for the poll ballot.
 *
 * The Set is seeded once from `initialIds` and is NEVER re-synced from props:
 * `router.refresh()` (fired after every vote save) re-renders without remounting,
 * so the seed isn't re-applied and the optimistic state stays authoritative —
 * the same reason `picks`/`expanded` survive that refresh in VoteForm. Do not
 * add a useEffect that syncs from `initialIds`.
 *
 * On a failed write we compare-and-revert: only undo if the id's current state
 * still equals the failed desired value, so a newer click isn't clobbered by a
 * late-resolving older request. Failures revert silently — this is a low-stakes
 * action that the server re-derives on the next load.
 */
export function useFavorites(initialIds: string[]) {
    const [favorites, setFavorites] = useState<Set<string>>(
        () => new Set(initialIds),
    )
    const [, startTransition] = useTransition()

    function toggle(restaurantId: string) {
        const desired = !favorites.has(restaurantId)
        setFavorites((prev) => withFavorite(prev, restaurantId, desired))
        startTransition(async () => {
            const result = await setFavoriteAction(restaurantId, desired)
            if (!result.ok) {
                setFavorites((prev) =>
                    prev.has(restaurantId) === desired
                        ? withFavorite(prev, restaurantId, !desired)
                        : prev,
                )
            }
        })
    }

    return { favorites, toggle }
}

function withFavorite(
    set: Set<string>,
    id: string,
    present: boolean,
): Set<string> {
    const next = new Set(set)
    if (present) next.add(id)
    else next.delete(id)
    return next
}
