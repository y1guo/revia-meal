/**
 * Deterministic hash → palette color for flavor-bar segments on `/people`.
 *
 * The palette is a curated 12-hue sub-palette of the Fresh Market accents
 * plus analogous tints. Ordering is stable; the hash picks an index.
 * docs/design/pages.md §/people locks these hues.
 */

const PALETTE = [
    '#E8A53C', // saffron-500
    '#6B8E4E', // sage-500
    '#4F6BB1', // indigo-500
    '#D9A43C', // honey-500
    '#C54A3E', // tomato-500
    '#8A7E5F', // butter-700 (warm taupe)
    '#B07C3A', // persimmon-ish
    '#7A8C6B', // olive
    '#9E5A7B', // plum
    '#4F8C89', // teal
    '#D18A5C', // peach
    '#A88C4F', // mustard
] as const

function hashString(s: string): number {
    let hash = 0
    for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i)
        hash |= 0
    }
    return hash
}

export function restaurantColor(name: string): string {
    const idx = Math.abs(hashString(name)) % PALETTE.length
    return PALETTE[idx]
}
