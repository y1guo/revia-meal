/**
 * Page-size config for the restaurants catalog list. Shared by the server page
 * (which clamps the `size` search param) and the client PageSizeSelect (which
 * offers the presets and validates a custom value) so the two never drift.
 */
export const PAGE_SIZE_PRESETS: readonly number[] = [25, 50, 100]
export const DEFAULT_PAGE_SIZE = 25
export const MIN_PAGE_SIZE = 1
export const MAX_PAGE_SIZE = 200

/**
 * Coerce the raw `size` query param into a safe row count. Anything that isn't
 * a positive integer falls back to the default; values above the cap are
 * clamped so a hand-edited URL can't ask for an unbounded query.
 */
export function parsePageSize(raw: string | undefined): number {
    const n = Number(raw)
    if (!Number.isInteger(n) || n < MIN_PAGE_SIZE) return DEFAULT_PAGE_SIZE
    return Math.min(n, MAX_PAGE_SIZE)
}
