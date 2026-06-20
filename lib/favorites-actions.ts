'use server'

import { requireUser } from '@/lib/auth'
import { setFavorite, type SetFavoriteResult } from '@/lib/favorites'

/**
 * Set the current user's favorite state for a restaurant. No ballot-membership
 * or existence check — favorites are user-global, the FK + composite PK enforce
 * integrity, and disabled/"Removed" restaurants are intentionally favoritable.
 * No revalidatePath: the client is optimistic and the poll route re-derives the
 * Favorites grouping from the DB on its next load.
 *
 * Kept in lib/ (not a route directory) so shared components/poll/ modules can
 * import it without reaching into a route-local actions file.
 */
export async function setFavoriteAction(
    restaurantId: string,
    favorite: boolean,
): Promise<SetFavoriteResult> {
    const user = await requireUser()
    if (!restaurantId) return { ok: false, error: 'Missing restaurant id.' }
    return setFavorite(user.id, restaurantId, favorite)
}
