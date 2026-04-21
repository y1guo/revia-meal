'use client'

import * as Popover from '@radix-ui/react-popover'
import { Clock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

type TimeInputProps = {
    /** "HH:MM" 24h format (empty string = unset) */
    value: string
    onChange: (value: string) => void
    required?: boolean
    disabled?: boolean
    className?: string
    'aria-label'?: string
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

function parseHHMM(v: string): { h: number; m: number } | null {
    const m = v.match(TIME_RE)
    if (!m) return null
    return { h: parseInt(m[1], 10), m: parseInt(m[2], 10) }
}

function fmtHH(h: number): string {
    return h < 10 ? `0${h}` : `${h}`
}

/**
 * Themed time picker used on admin screens. A text-input-styled trigger opens
 * a Radix Popover with two scrollable hour/minute columns. Free-text entry is
 * still accepted in the trigger itself for keyboard speed.
 */
export function TimeInput({
    value,
    onChange,
    required,
    disabled,
    className,
    'aria-label': ariaLabel,
}: TimeInputProps) {
    const [open, setOpen] = useState(false)
    const [draft, setDraft] = useState(value)

    // Keep draft in sync when parent value changes while the popover is closed
    // (e.g. form reset). Don't clobber user keystrokes mid-edit.
    useEffect(() => {
        if (!open) setDraft(value)
    }, [value, open])

    const parsed = parseHHMM(draft) ?? parseHHMM(value) ?? { h: 0, m: 0 }
    const invalid = draft !== '' && !parseHHMM(draft)

    const commitDraft = () => {
        if (draft === '' || parseHHMM(draft)) onChange(draft)
        else setDraft(value) // revert invalid free-text
    }

    const setHour = (h: number) => {
        const next = `${fmtHH(h)}:${fmtHH(parsed.m)}`
        setDraft(next)
        onChange(next)
    }
    const setMinute = (m: number) => {
        const next = `${fmtHH(parsed.h)}:${fmtHH(m)}`
        setDraft(next)
        onChange(next)
    }

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <div
                className={cn(
                    'inline-flex items-center gap-1 w-full',
                    'h-8 px-2.5 text-[0.8125rem]',
                    'bg-[color:var(--surface-raised)]',
                    'border rounded-[var(--radius-md)]',
                    'transition-colors duration-150',
                    'focus-within:border-[color:var(--accent-brand)]',
                    invalid
                        ? 'border-danger-500'
                        : 'border-[color:var(--border-subtle)]',
                    disabled && 'opacity-50 cursor-not-allowed',
                    className,
                )}
            >
                <input
                    type="text"
                    inputMode="numeric"
                    placeholder="--:--"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitDraft}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault()
                            commitDraft()
                        }
                    }}
                    required={required}
                    disabled={disabled}
                    aria-label={ariaLabel}
                    aria-invalid={invalid || undefined}
                    className={cn(
                        'flex-1 bg-transparent outline-none',
                        'font-mono tabular-nums',
                        'text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)]',
                        'disabled:cursor-not-allowed',
                    )}
                />
                <Popover.Trigger asChild>
                    <button
                        type="button"
                        disabled={disabled}
                        aria-label={`${ariaLabel ?? 'Time'} picker`}
                        className={cn(
                            'inline-flex items-center justify-center',
                            'w-5 h-5 rounded-[var(--radius-sm)]',
                            'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]',
                            'hover:bg-[color:var(--surface-sunken)]',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]',
                            'transition-colors duration-150',
                            'disabled:cursor-not-allowed',
                        )}
                    >
                        <Clock
                            size={14}
                            strokeWidth={1.75}
                            aria-hidden="true"
                        />
                    </button>
                </Popover.Trigger>
            </div>
            <Popover.Portal>
                <Popover.Content
                    align="start"
                    sideOffset={6}
                    className={cn(
                        'z-50 flex gap-1',
                        'p-2 rounded-[var(--radius-md)]',
                        'bg-[color:var(--surface-raised)]',
                        'border border-[color:var(--border-subtle)]',
                        'shadow-[var(--shadow-card-hover)]',
                    )}
                >
                    <TimeColumn
                        values={Array.from({ length: 24 }, (_, i) => i)}
                        current={parsed.h}
                        label="Hours"
                        onSelect={setHour}
                    />
                    <TimeColumn
                        values={Array.from({ length: 12 }, (_, i) => i * 5)}
                        current={parsed.m - (parsed.m % 5)}
                        label="Minutes"
                        onSelect={setMinute}
                    />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    )
}

function TimeColumn({
    values,
    current,
    label,
    onSelect,
}: {
    values: number[]
    current: number
    label: string
    onSelect: (n: number) => void
}) {
    const listRef = useRef<HTMLDivElement>(null)
    const currentRef = useRef<HTMLButtonElement>(null)

    // Scroll the active row into view when the popover mounts / re-opens.
    useEffect(() => {
        const el = currentRef.current
        if (!el) return
        el.scrollIntoView({ block: 'center' })
    }, [current])

    return (
        <div className="flex flex-col">
            <span className="text-[0.6875rem] uppercase tracking-wide text-[color:var(--text-tertiary)] px-2 py-1">
                {label}
            </span>
            <div
                ref={listRef}
                className={cn(
                    'flex flex-col gap-0.5',
                    'w-14 max-h-[180px] overflow-y-auto',
                    'pr-0.5',
                )}
            >
                {values.map((v) => {
                    const active = v === current
                    return (
                        <button
                            key={v}
                            ref={active ? currentRef : null}
                            type="button"
                            onClick={() => onSelect(v)}
                            className={cn(
                                'px-2 py-1 text-[0.8125rem] font-mono tabular-nums',
                                'rounded-[var(--radius-sm)]',
                                'transition-colors duration-100',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]',
                                active
                                    ? 'bg-[color:var(--accent-brand)] text-[color:var(--text-on-accent)]'
                                    : 'hover:bg-[color:var(--surface-sunken)] text-[color:var(--text-primary)]',
                            )}
                        >
                            {fmtHH(v)}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

