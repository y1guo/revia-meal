/**
 * Split an ordered list of items into favorites and the rest, each preserving
 * the input order. Callers pass a list already sorted (active-first, then
 * alphabetical) so within the Favorites group a disabled ("Removed") restaurant
 * naturally sorts to the bottom.
 */
export function partitionFavorites<T extends { id: string }>(
    items: T[],
    favorites: Set<string>,
): { favorites: T[]; rest: T[] } {
    const favs: T[] = []
    const rest: T[] = []
    for (const item of items) {
        if (favorites.has(item.id)) favs.push(item)
        else rest.push(item)
    }
    return { favorites: favs, rest }
}
