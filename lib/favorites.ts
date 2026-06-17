import { createAdminClient } from '@/lib/supabase/admin'

export type SetFavoriteResult = { ok: true } | { ok: false; error: string }

/**
 * Restaurant ids the user has favorited, restricted to `restaurantIds` (the
 * current ballot). Favorites are user-global; the caller narrows to the ballot.
 */
export async function getFavoriteRestaurantIds(
    userId: string,
    restaurantIds: string[],
): Promise<string[]> {
    // An empty `.in([])` is a footgun (PostgREST can error / return everything),
    // so short-circuit — mirrors the restaurants-fetch guard in the poll page.
    if (restaurantIds.length === 0) return []

    const admin = createAdminClient()
    const { data } = await admin
        .from('restaurant_favorites')
        .select('restaurant_id')
        .eq('user_id', userId)
        .in('restaurant_id', restaurantIds)
    return (data ?? []).map((r) => r.restaurant_id as string)
}

/**
 * Set a restaurant's favorite state for a user to the desired end state.
 * Idempotent: the caller sends the target boolean (not a blind toggle), so
 * rapid/repeated calls converge. Success is keyed off the absence of an error,
 * not the returned row count (an ignored-duplicate insert or a no-op delete
 * both return zero rows yet are successful).
 */
export async function setFavorite(
    userId: string,
    restaurantId: string,
    favorite: boolean,
): Promise<SetFavoriteResult> {
    const admin = createAdminClient()
    if (favorite) {
        const { error } = await admin
            .from('restaurant_favorites')
            .upsert(
                { user_id: userId, restaurant_id: restaurantId },
                { onConflict: 'user_id,restaurant_id', ignoreDuplicates: true },
            )
        if (error) return { ok: false, error: error.message }
    } else {
        const { error } = await admin
            .from('restaurant_favorites')
            .delete()
            .eq('user_id', userId)
            .eq('restaurant_id', restaurantId)
        if (error) return { ok: false, error: error.message }
    }
    return { ok: true }
}
