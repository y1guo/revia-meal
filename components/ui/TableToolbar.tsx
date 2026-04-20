'use client'

import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type TableToolbarProps = {
    /** Left side: search, filter chips, etc. */
    children?: ReactNode
    /** Right side: primary action(s) and row-count caption. */
    trailing?: ReactNode
    /** When bulk is provided, the toolbar swaps into bulk-action mode. */
    bulk?: {
        count: number
        actions: ReactNode
        onClear: () => void
    }
    className?: string
}

export function TableToolbar({
    children,
    trailing,
    bulk,
    className,
}: TableToolbarProps) {
    if (bulk && bulk.count > 0) {
        return (
            <div
                className={cn(
                    'flex flex-wrap items-center gap-3',
                    'px-4 py-3 rounded-[var(--radius-lg)]',
                    'bg-[color:var(--accent-brand)]/10',
                    'border border-[color:var(--accent-brand)]/30',
                    className,
                )}
                role="region"
                aria-label={`${bulk.count} selected`}
            >
                <button
                    type="button"
                    onClick={bulk.onClear}
                    aria-label="Clear selection"
                    className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-full',
                        'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]',
                        'hover:bg-[color:var(--surface-raised)]',
                        'transition-colors duration-150',
                    )}
                >
                    <X size={14} strokeWidth={1.75} aria-hidden="true" />
                </button>
                <span className="text-[0.875rem] font-medium text-[color:var(--text-primary)]">
                    {bulk.count} selected
                </span>
                <div className="ml-auto flex items-center gap-2">
                    {bulk.actions}
                </div>
            </div>
        )
    }
    return (
        <div
            className={cn(
                'flex flex-col gap-3 md:flex-row md:items-center md:justify-between',
                className,
            )}
        >
            <div className="flex flex-wrap items-center gap-2 md:flex-1">
                {children}
            </div>
            {trailing && (
                <div className="flex items-center gap-3">{trailing}</div>
            )}
        </div>
    )
}

export function TableCount({
    showing,
    total,
    noun,
    className,
}: {
    showing: number
    total: number
    /** Singular noun; "s" will be appended for the total unless it's 1. */
    noun: string
    className?: string
}) {
    const word = total === 1 ? noun : `${noun}s`
    return (
        <span
            className={cn(
                'text-[0.8125rem] tabular-nums text-[color:var(--text-secondary)]',
                className,
            )}
        >
            {showing === total
                ? `${total} ${word}`
                : `${showing} of ${total} ${word}`}
        </span>
    )
}
