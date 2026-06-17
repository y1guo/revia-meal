/**
 * Company-timezone date/time formatting.
 *
 * Server-rendered `toLocaleDateString/Time()` without an explicit `timeZone`
 * uses the Node runtime's timezone — UTC on most prod hosts — which is not
 * what viewers in the team's local time expect. Every server-rendered
 * timestamp goes through one of these helpers so the app reads consistently
 * regardless of where it runs.
 *
 * `NEXT_PUBLIC_COMPANY_TZ` overrides the default. Exposed to the client so
 * `'use client'` components format identically to server-rendered markup and
 * avoid hydration-mismatch warnings.
 */

export const COMPANY_TZ =
    process.env.NEXT_PUBLIC_COMPANY_TZ || 'America/Los_Angeles'

const LOCALE = 'en-US'

export function formatDate(
    value: Date | string,
    opts: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    },
): string {
    const d = typeof value === 'string' ? new Date(value) : value
    return d.toLocaleDateString(LOCALE, { ...opts, timeZone: COMPANY_TZ })
}

export function formatTime(
    value: Date | string,
    opts: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
    },
): string {
    const d = typeof value === 'string' ? new Date(value) : value
    return d.toLocaleTimeString(LOCALE, { ...opts, timeZone: COMPANY_TZ })
}

export function formatDateTime(
    value: Date | string,
    opts: Intl.DateTimeFormatOptions = {
        dateStyle: 'medium',
        timeStyle: 'short',
    },
): string {
    const d = typeof value === 'string' ? new Date(value) : value
    return d.toLocaleString(LOCALE, { ...opts, timeZone: COMPANY_TZ })
}

/** Today's YYYY-MM-DD in the company timezone — used for default date ranges. */
export function todayISO(now: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: COMPANY_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now)
}

/** YYYY-MM-DD for an arbitrary date in the company timezone. */
export function toISODate(d: Date): string {
    return todayISO(d)
}

/**
 * Whole-calendar-day difference between `value` and `now`, measured in
 * `COMPANY_TZ`. Both endpoints are reduced to their company-timezone calendar
 * date (via `toISODate`) before diffing, so an evening-Pacific timestamp — which
 * is the next day in UTC — still counts as the correct local day. The y/m/d parts
 * are diffed through `Date.UTC` purely as a DST-safe day counter; we never read
 * `.getDate()/.getUTCDate()` off the raw timestamp.
 */
export function daysAgo(value: Date | string, now: Date = new Date()): number {
    const d = typeof value === 'string' ? new Date(value) : value
    const [vy, vm, vd] = toISODate(d).split('-').map(Number)
    const [ny, nm, nd] = toISODate(now).split('-').map(Number)
    const MS_PER_DAY = 24 * 60 * 60 * 1000
    return Math.round(
        (Date.UTC(ny, nm - 1, nd) - Date.UTC(vy, vm - 1, vd)) / MS_PER_DAY,
    )
}

/** Human relative-day label: 0 → "today", 1 → "yesterday", else "N days ago". */
export function formatDaysAgo(n: number): string {
    if (n <= 0) return 'today'
    if (n === 1) return 'yesterday'
    return `${n} days ago`
}
