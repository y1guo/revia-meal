'use client'

import { Bookmark } from 'lucide-react'
import { cn } from '@/lib/cn'

type FavoriteButtonProps = {
    active: boolean
    onToggle: () => void
    /** Restaurant name, woven into the aria-label for clarity. */
    restaurantName?: string
}

export function FavoriteButton({
    active,
    onToggle,
    restaurantName,
}: FavoriteButtonProps) {
    const label = `${active ? 'Remove from' : 'Add to'} favorites${
        restaurantName ? ` — ${restaurantName}` : ''
    }`
    return (
        <button
            type="button"
            aria-pressed={active}
            aria-label={label}
            title={active ? 'Remove from favorites' : 'Add to favorites'}
            onClick={(e) => {
                // The button sits inside VoteForm's <label>; never toggle the
                // checkbox (harmless no-op in the read-only preview context).
                e.preventDefault()
                e.stopPropagation()
                onToggle()
            }}
            className={cn(
                'mt-0.5 shrink-0',
                'inline-flex items-center justify-center',
                'h-8 w-8 rounded-[var(--radius-md)]',
                'hover:bg-[color:var(--surface-sunken)]',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]',
                active
                    ? 'text-[color:var(--accent-brand)]'
                    : 'text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)]',
            )}
        >
            <Bookmark
                size={18}
                strokeWidth={1.75}
                fill={active ? 'currentColor' : 'none'}
                aria-hidden="true"
            />
        </button>
    )
}
