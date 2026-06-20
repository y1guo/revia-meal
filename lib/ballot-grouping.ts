// Pure, display-only helpers for the open-poll ballot: collecting the cuisine
// tags present, filtering by selected tags, and bucketing restaurants into
// cuisine groups. These never touch picks or persistence — they only reshape
// what the vote form renders, so hiding/regrouping rows is always safe.
//
// Generic over a minimal shape so this module stays in `lib/` without importing
// the `Ballot` type from `app/` (which would invert the dependency direction).

import type { RichContent } from '@/lib/rich-content'

type WithCuisines = { rich_content: RichContent | null }

/** Untagged restaurants are bucketed here; rendered last, after named cuisines. */
const OTHER_LABEL = 'Other'

/** Case-fold for case-insensitive de-dup, grouping, and filter matching. */
function fold(tag: string): string {
    return tag.toLocaleLowerCase()
}

export function cuisinesOf(item: WithCuisines): string[] {
    return item.rich_content?.cuisines ?? []
}

/**
 * Distinct cuisine tags present across the ballot, de-duped case-insensitively
 * (first-seen casing wins) and sorted alphabetically. Drives the filter chips.
 */
export function collectCuisineTags(ballot: WithCuisines[]): string[] {
    const seen = new Map<string, string>() // folded key -> first-seen display label
    for (const item of ballot) {
        for (const tag of cuisinesOf(item)) {
            const key = fold(tag)
            if (!seen.has(key)) seen.set(key, tag)
        }
    }
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b))
}

/** A restaurant's single "home" cuisine for grouping: its first DoorDash tag. */
export function primaryCuisine(item: WithCuisines): string | null {
    return cuisinesOf(item)[0] ?? null
}

/**
 * Keep restaurants matching ANY active tag (inclusive). With no active tags,
 * returns the ballot unchanged. Untagged restaurants drop out while a filter is
 * active — surfaced to the user via the hidden-picks hint in the vote form.
 */
export function filterByCuisines<T extends WithCuisines>(
    ballot: T[],
    active: Set<string>,
): T[] {
    if (active.size === 0) return ballot
    const foldedActive = new Set(Array.from(active, fold))
    return ballot.filter((item) =>
        cuisinesOf(item).some((c) => foldedActive.has(fold(c))),
    )
}

export type CuisineGroup<T> = { label: string; items: T[] }

/**
 * Bucket restaurants by their primary cuisine, preserving the input order within
 * each bucket (the caller pre-sorts active-first / alphabetical, so disabled rows
 * stay last per group). Groups are case-folded so "Thai"/"thai" merge under the
 * first-seen label. Named groups are sorted alphabetically; "Other" (untagged)
 * sorts last. Empty groups never appear since buckets are created on first member.
 */
export function groupByCuisine<T extends WithCuisines>(
    ballot: T[],
): CuisineGroup<T>[] {
    // Untagged restaurants bucket under a Symbol key so they can never collide
    // with a real cuisine — a tag literally named "Other" folds to "other",
    // which must remain its own named group rather than merging here.
    const untaggedKey = Symbol('untagged')
    const byKey = new Map<string | symbol, CuisineGroup<T>>()
    for (const item of ballot) {
        const primary = primaryCuisine(item)
        const key = primary === null ? untaggedKey : fold(primary)
        let group = byKey.get(key)
        if (!group) {
            group = { label: primary ?? OTHER_LABEL, items: [] }
            byKey.set(key, group)
        }
        group.items.push(item)
    }
    const other = byKey.get(untaggedKey)
    const named = Array.from(byKey.entries())
        .filter(([key]) => key !== untaggedKey)
        .map(([, group]) => group)
        .sort((a, b) => a.label.localeCompare(b.label))
    return other ? [...named, other] : named
}
