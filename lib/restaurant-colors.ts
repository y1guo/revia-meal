/**
 * Deterministic hash → palette color for flavor-bar segments on `/people`.
 *
 * Curated 12-hue spectrum in the Aurora family but kept deep and muted so the
 * stacked flavor bars read calm (not neon) and white segment labels stay
 * legible. Hues stay diverse so adjacent segments distinguish without clashing.
 * Ordering is stable; the hash picks an index.
 */

const PALETTE = [
    '#5B3FA8', // muted violet
    '#2D5F7A', // muted steel-cyan
    '#1E7355', // muted emerald
    '#8A6516', // muted ochre
    '#A33D63', // muted rose
    '#A8502A', // muted terracotta
    '#45458F', // muted indigo
    '#7E4290', // muted plum
    '#1F6E6E', // muted teal
    '#566E2C', // muted olive
    '#3E5680', // muted slate-blue
    '#84456B', // muted mauve
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
