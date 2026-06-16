'use client'

import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { cn } from '@/lib/cn'

type CuisineFilterBarProps = {
    /** Distinct cuisine tags present on the ballot (first-seen casing). */
    tags: string[]
    /** Currently-selected tags (stored in display casing). */
    active: Set<string>
    onToggle: (tag: string) => void
    onClear: () => void
    grouped: boolean
    onGroupedChange: (grouped: boolean) => void
}

export function CuisineFilterBar({
    tags,
    active,
    onToggle,
    onClear,
    grouped,
    onGroupedChange,
}: CuisineFilterBarProps) {
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <label
                    htmlFor="group-by-cuisine"
                    className="flex cursor-pointer select-none items-center gap-2 text-[0.875rem] text-[color:var(--text-secondary)]"
                >
                    <Switch
                        id="group-by-cuisine"
                        checked={grouped}
                        onCheckedChange={onGroupedChange}
                    />
                    Group by cuisine
                </label>
                {active.size > 0 && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onClear}
                    >
                        Clear filters
                    </Button>
                )}
            </div>
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => {
                        const isActive = active.has(tag)
                        return (
                            <button
                                key={tag}
                                type="button"
                                aria-pressed={isActive}
                                onClick={() => onToggle(tag)}
                                className={cn(
                                    'inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5',
                                    'text-[0.75rem] font-medium leading-none',
                                    'transition-colors duration-150',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]',
                                    isActive
                                        ? 'bg-[color:var(--accent-brand)] text-[color:var(--text-on-accent)]'
                                        : 'bg-[color:var(--surface-sunken)] text-[color:var(--text-primary)] hover:bg-[color:var(--choice-hover-bg)]',
                                )}
                            >
                                {tag}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
