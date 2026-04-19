'use client'

import * as Popover from '@radix-ui/react-popover'
import { format, parse } from 'date-fns'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useId, useState } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { cn } from '@/lib/cn'

type DateRangeFieldProps = {
    /** ISO date string `YYYY-MM-DD` */
    from: string
    /** ISO date string `YYYY-MM-DD` */
    to: string
    fromName?: string
    toName?: string
    label?: string
    className?: string
    disabled?: boolean
}

function parseIso(value: string): Date | undefined {
    if (!value) return undefined
    try {
        return parse(value, 'yyyy-MM-dd', new Date())
    } catch {
        return undefined
    }
}

function toIso(date: Date | undefined): string {
    return date ? format(date, 'yyyy-MM-dd') : ''
}

function displayLabel(range: DateRange | undefined): string {
    if (!range?.from) return 'Select range'
    if (!range.to) return format(range.from, 'MMM d, yyyy')
    const sameYear = range.from.getFullYear() === range.to.getFullYear()
    const fromStr = format(range.from, sameYear ? 'MMM d' : 'MMM d, yyyy')
    const toStr = format(range.to, 'MMM d, yyyy')
    return `${fromStr} – ${toStr}`
}

export function DateRangeField({
    from,
    to,
    fromName = 'from',
    toName = 'to',
    label,
    className,
    disabled,
}: DateRangeFieldProps) {
    const [range, setRange] = useState<DateRange | undefined>(() => ({
        from: parseIso(from),
        to: parseIso(to),
    }))
    const [open, setOpen] = useState(false)
    const describedId = useId()

    const fromIso = toIso(range?.from)
    const toIsoValue = toIso(range?.to)

    return (
        <div className={cn('inline-flex flex-col gap-1', className)}>
            {label && (
                <span
                    id={describedId}
                    className="text-[0.75rem] font-medium text-[color:var(--text-secondary)]"
                >
                    {label}
                </span>
            )}
            <input type="hidden" name={fromName} value={fromIso} />
            <input type="hidden" name={toName} value={toIsoValue} />
            <Popover.Root open={open} onOpenChange={setOpen}>
                <Popover.Trigger asChild>
                    <button
                        type="button"
                        disabled={disabled}
                        aria-labelledby={label ? describedId : undefined}
                        className={cn(
                            'inline-flex items-center gap-2',
                            'h-9 px-3 rounded-[var(--radius-md)]',
                            'bg-[color:var(--surface-raised)]',
                            'border border-[color:var(--border-subtle)]',
                            'text-[0.875rem] text-[color:var(--text-primary)]',
                            'hover:border-[color:var(--border-strong)]',
                            'data-[state=open]:border-[color:var(--accent-brand)]',
                            'transition-colors duration-150',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                        )}
                    >
                        <CalendarIcon
                            size={14}
                            strokeWidth={1.75}
                            aria-hidden="true"
                            className="text-[color:var(--text-secondary)]"
                        />
                        <span>{displayLabel(range)}</span>
                    </button>
                </Popover.Trigger>
                <Popover.Portal>
                    <Popover.Content
                        align="start"
                        sideOffset={4}
                        className={cn(
                            'z-50 p-3',
                            'bg-[color:var(--surface-raised)]',
                            'border border-[color:var(--border-subtle)]',
                            'rounded-[var(--radius-lg)]',
                            'shadow-[var(--shadow-card-hover)]',
                        )}
                    >
                        <DayPicker
                            mode="range"
                            selected={range}
                            onSelect={(next) => setRange(next)}
                            numberOfMonths={1}
                            showOutsideDays
                            weekStartsOn={0}
                            components={{
                                Chevron: ({ orientation }) => {
                                    const Icon =
                                        orientation === 'left'
                                            ? ChevronLeft
                                            : ChevronRight
                                    return (
                                        <Icon
                                            size={16}
                                            strokeWidth={1.75}
                                            aria-hidden="true"
                                        />
                                    )
                                },
                            }}
                            classNames={{
                                root: 'text-[0.875rem] text-[color:var(--text-primary)]',
                                month: 'space-y-3',
                                month_caption:
                                    'flex items-center justify-center text-[0.9375rem] font-medium',
                                caption_label: 'font-display',
                                nav: 'absolute top-1 right-1 flex items-center gap-0.5',
                                button_previous:
                                    'inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-sunken)] hover:text-[color:var(--text-primary)] absolute left-1 top-1',
                                button_next:
                                    'inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-sunken)] hover:text-[color:var(--text-primary)] absolute right-1 top-1',
                                month_grid: 'w-full border-collapse',
                                weekdays: 'flex',
                                weekday:
                                    'w-9 h-8 text-[0.6875rem] font-medium uppercase tracking-wide text-[color:var(--text-tertiary)] flex items-center justify-center',
                                week: 'flex w-full',
                                day: 'relative',
                                day_button: cn(
                                    'inline-flex h-9 w-9 items-center justify-center',
                                    'rounded-[var(--radius-sm)] text-[0.875rem]',
                                    'hover:bg-[color:var(--surface-sunken)]',
                                    'focus-visible:outline-2 focus-visible:outline-[color:var(--accent-brand)]',
                                ),
                                today: 'font-semibold text-[color:var(--accent-brand)]',
                                outside: 'text-[color:var(--text-tertiary)]',
                                disabled:
                                    'opacity-40 cursor-not-allowed hover:bg-transparent',
                                selected:
                                    '[&>button]:bg-[color:var(--accent-brand)] [&>button]:text-[color:var(--text-on-accent)] [&>button]:hover:bg-[color:var(--accent-brand-hover)]',
                                range_start:
                                    '[&>button]:rounded-r-none',
                                range_end:
                                    '[&>button]:rounded-l-none',
                                range_middle: cn(
                                    'bg-[color:var(--banked-bg)]',
                                    '[&>button]:bg-transparent [&>button]:text-[color:var(--text-primary)] [&>button]:rounded-none',
                                ),
                            }}
                        />
                    </Popover.Content>
                </Popover.Portal>
            </Popover.Root>
        </div>
    )
}
