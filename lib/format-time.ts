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
