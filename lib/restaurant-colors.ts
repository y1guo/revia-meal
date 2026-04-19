/**
 * Deterministic hash → palette color for flavor-bar segments on `/people`.
 *
 * Curated 12-hue spectrum derived from the Boba / Lime / Sunny brand with
 * analogous neighbors so adjacent segments still distinguish without clashing.
 * Ordering is stable; the hash picks an index.
 */

const PALETTE = [
    '#33C5E0', // boba-400 — primary teal-cyan
    '#8FE879', // lime-500 — primary green
    '#FFD25E', // sunny-500 — primary yellow
    '#1EA8C4', // boba-500 — deeper teal
    '#70C855', // lime-600 — deeper green
    '#E0B445', // sunny-600 — deeper yellow
    '#66D7EC', // boba-300 — bright cyan
    '#A9F095', // lime-400 — mint
    '#FFB960', // warning-400 — apricot
    '#F66B60', // danger-400 — coral
    '#8FA0A2', // slate-400 — cool neutral
    '#B48A2C', // sunny-700 — bronze
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
