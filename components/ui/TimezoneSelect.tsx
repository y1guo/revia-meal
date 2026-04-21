'use client'

import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

type TimezoneSelectProps = {
    value: string
    onChange: (value: string) => void
    required?: boolean
    disabled?: boolean
    className?: string
    'aria-label'?: string
}

/**
 * Cached list of all IANA zones with their current UTC offset in minutes.
 * Built on first mount via `Intl.supportedValuesOf('timeZone')` (fallback to
 * a curated short list if the API isn't available — rare but possible in
 * older runtimes).
 */
type ZoneInfo = {
    id: string
    offsetMinutes: number
    offsetLabel: string
    displayName: string
}

const FALLBACK_ZONES = [
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'UTC',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney',
]

function computeOffsetMinutes(tz: string, at: Date): number | null {
    try {
        // Formatter with timeZoneName: "shortOffset" returns strings like
        // "GMT-08:00". We parse the offset rather than using date-math tricks
        // which misbehave around DST transitions.
        const fmt = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            timeZoneName: 'shortOffset',
        })
        const parts = fmt.formatToParts(at)
        const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
        const m = name.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?/)
        if (!m) return 0 // "GMT" with no offset = UTC
        const sign = m[1] === '-' ? -1 : 1
        const hours = parseInt(m[2], 10)
        const mins = m[3] ? parseInt(m[3], 10) : 0
        return sign * (hours * 60 + mins)
    } catch {
        return null
    }
}

function formatOffset(mins: number): string {
    const sign = mins < 0 ? '−' : '+'
    const abs = Math.abs(mins)
    const h = Math.floor(abs / 60)
    const m = abs % 60
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
    return `UTC${sign}${pad(h)}:${pad(m)}`
}

function buildZones(): ZoneInfo[] {
    const now = new Date()
    const anyIntl = Intl as unknown as {
        supportedValuesOf?: (key: string) => string[]
    }
    const ids: string[] =
        typeof anyIntl.supportedValuesOf === 'function'
            ? anyIntl.supportedValuesOf('timeZone')
            : FALLBACK_ZONES
    const out: ZoneInfo[] = []
    for (const id of ids) {
        const offset = computeOffsetMinutes(id, now)
        if (offset === null) continue
        out.push({
            id,
            offsetMinutes: offset,
            offsetLabel: formatOffset(offset),
            displayName: id.replace(/_/g, ' '),
        })
    }
    // Sort primarily by offset ascending, secondarily by name.
    out.sort(
        (a, b) =>
            a.offsetMinutes - b.offsetMinutes ||
            a.displayName.localeCompare(b.displayName),
    )
    return out
}

export function TimezoneSelect({
    value,
    onChange,
    required,
    disabled,
    className,
    'aria-label': ariaLabel,
}: TimezoneSelectProps) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const searchRef = useRef<HTMLInputElement>(null)

    const zones = useMemo(buildZones, [])
    const current = useMemo(
        () => zones.find((z) => z.id === value) ?? null,
        [zones, value],
    )

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return zones
        return zones.filter(
            (z) =>
                z.displayName.toLowerCase().includes(q) ||
                z.id.toLowerCase().includes(q) ||
                z.offsetLabel.toLowerCase().includes(q),
        )
    }, [zones, query])

    useEffect(() => {
        if (open) {
            // Autofocus the search field when the popover opens.
            requestAnimationFrame(() => searchRef.current?.focus())
        } else {
            setQuery('')
        }
    }, [open])

    const triggerLabel = current
        ? `${current.displayName} (${current.offsetLabel})`
        : value || 'Select timezone'

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    aria-label={ariaLabel ?? 'Timezone'}
                    aria-required={required || undefined}
                    className={cn(
                        'inline-flex items-center justify-between gap-2',
                        'w-full h-8 px-2.5 text-[0.8125rem]',
                        'bg-[color:var(--surface-raised)]',
                        'border border-[color:var(--border-subtle)]',
                        'rounded-[var(--radius-md)]',
                        'text-[color:var(--text-primary)]',
                        'transition-colors duration-150',
                        'focus-visible:outline-none focus-visible:border-[color:var(--accent-brand)]',
                        'data-[state=open]:border-[color:var(--accent-brand)]',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        className,
                    )}
                >
                    <span className="truncate text-left">{triggerLabel}</span>
                    <ChevronsUpDown
                        size={14}
                        strokeWidth={1.75}
                        aria-hidden="true"
                        className="shrink-0 text-[color:var(--text-secondary)]"
                    />
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    align="start"
                    sideOffset={4}
                    className={cn(
                        'z-50 w-[var(--radix-popover-trigger-width)] min-w-[280px]',
                        'rounded-[var(--radius-md)]',
                        'bg-[color:var(--surface-raised)]',
                        'border border-[color:var(--border-subtle)]',
                        'shadow-[var(--shadow-card-hover)]',
                        'overflow-hidden',
                    )}
                >
                    <div
                        className={cn(
                            'flex items-center gap-2',
                            'px-2.5 py-2',
                            'border-b border-[color:var(--border-subtle)]',
                        )}
                    >
                        <Search
                            size={14}
                            strokeWidth={1.75}
                            aria-hidden="true"
                            className="shrink-0 text-[color:var(--text-tertiary)]"
                        />
                        <input
                            ref={searchRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search city or UTC offset…"
                            className={cn(
                                'flex-1 bg-transparent outline-none',
                                'text-[0.8125rem] text-[color:var(--text-primary)]',
                                'placeholder:text-[color:var(--text-tertiary)]',
                            )}
                        />
                    </div>
                    <div
                        role="listbox"
                        className="max-h-[280px] overflow-y-auto py-1"
                    >
                        {filtered.length === 0 ? (
                            <div className="px-3 py-2 text-[0.8125rem] text-[color:var(--text-tertiary)]">
                                No matches.
                            </div>
                        ) : (
                            filtered.map((z) => {
                                const active = z.id === value
                                return (
                                    <button
                                        key={z.id}
                                        type="button"
                                        role="option"
                                        aria-selected={active}
                                        onClick={() => {
                                            onChange(z.id)
                                            setOpen(false)
                                        }}
                                        className={cn(
                                            'w-full flex items-center gap-2',
                                            'px-2.5 py-1.5 text-[0.8125rem] text-left',
                                            'transition-colors duration-100',
                                            active
                                                ? 'bg-[color:var(--surface-sunken)] font-medium'
                                                : 'hover:bg-[color:var(--surface-sunken)]',
                                        )}
                                    >
                                        <Check
                                            size={14}
                                            strokeWidth={2}
                                            aria-hidden="true"
                                            className={cn(
                                                'shrink-0',
                                                active
                                                    ? 'text-[color:var(--accent-brand)]'
                                                    : 'invisible',
                                            )}
                                        />
                                        <span className="flex-1 truncate text-[color:var(--text-primary)]">
                                            {z.displayName}
                                        </span>
                                        <span className="shrink-0 font-mono tabular-nums text-[0.75rem] text-[color:var(--text-tertiary)]">
                                            {z.offsetLabel}
                                        </span>
                                    </button>
                                )
                            })
                        )}
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    )
}
