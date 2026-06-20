'use client'

import { Search, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { cn } from '@/lib/cn'

type SearchInputProps = {
    /** Query-string key to drive. Defaults to "q". */
    paramKey?: string
    placeholder?: string
    /** Debounce delay in ms. Defaults to 300. */
    debounceMs?: number
    className?: string
    /**
     * Also reset these params when the search changes (e.g. pagination).
     * Handy so typing doesn't leave you on an out-of-range page.
     */
    resetParams?: string[]
}

/**
 * URL-driven, debounced search input. Pushes `?paramKey=…` to the current
 * route; the page reads it from searchParams server-side. Clear button
 * removes the param when the input has content.
 */
export function SearchInput({
    paramKey = 'q',
    placeholder = 'Search…',
    debounceMs = 300,
    className,
    resetParams = [],
}: SearchInputProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const urlValue = searchParams.get(paramKey) ?? ''
    const [value, setValue] = useState(urlValue)
    const [prevUrlValue, setPrevUrlValue] = useState(urlValue)
    const [, startTransition] = useTransition()
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    // The value our own debounced push last sent to the URL. Kept in a ref so
    // updating it never triggers a render and is never compared against a
    // not-yet-committed `urlValue` (the navigation runs in a transition, so the
    // URL lags behind our push by a render or two).
    const lastPushed = useRef(urlValue)

    // Sync local state when the URL changes from outside (back button, link
    // with a ?q= param, etc.) using React's store-info-from-previous-renders
    // pattern — no effect needed. We only overwrite live typing when the new
    // URL value wasn't one we produced ourselves; otherwise a slow navigation
    // committing our own push would snap the box back over the user's input.
    if (urlValue !== prevUrlValue) {
        setPrevUrlValue(urlValue)
        if (urlValue !== lastPushed.current) setValue(urlValue)
    }

    const push = (next: string) => {
        const trimmed = next.trim()
        const params = new URLSearchParams(searchParams.toString())
        if (trimmed) params.set(paramKey, trimmed)
        else params.delete(paramKey)
        for (const k of resetParams) params.delete(k)
        // Remember what we're navigating to so the sync above treats the
        // resulting URL change as self-inflicted and leaves the input alone.
        lastPushed.current = trimmed
        startTransition(() => {
            const qs = params.toString()
            router.replace(qs ? `?${qs}` : '?', { scroll: false })
        })
    }

    const onChange = (next: string) => {
        setValue(next)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => push(next), debounceMs)
    }

    const onClear = () => {
        if (timer.current) clearTimeout(timer.current)
        setValue('')
        push('')
    }

    return (
        <div className={cn('relative w-full', className)}>
            <Search
                size={16}
                strokeWidth={1.75}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-tertiary)]"
            />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={cn(
                    'block w-full h-11',
                    'pl-9 pr-9',
                    'bg-[color:var(--surface-raised)]',
                    'border border-[color:var(--border-subtle)]',
                    'rounded-[var(--radius-md)]',
                    'text-[0.875rem] text-[color:var(--text-primary)]',
                    'placeholder:text-[color:var(--text-tertiary)]',
                    'focus:outline-none focus-visible:border-[color:var(--accent-brand)]',
                    'transition-colors duration-150',
                )}
            />
            {value && (
                <button
                    type="button"
                    onClick={onClear}
                    aria-label="Clear search"
                    className={cn(
                        'absolute right-2 top-1/2 -translate-y-1/2',
                        'inline-flex h-6 w-6 items-center justify-center rounded-full',
                        'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]',
                        'hover:bg-[color:var(--surface-sunken)]',
                        'transition-colors duration-150',
                    )}
                >
                    <X size={14} strokeWidth={1.75} aria-hidden="true" />
                </button>
            )}
        </div>
    )
}
