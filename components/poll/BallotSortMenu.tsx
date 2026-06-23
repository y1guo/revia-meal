'use client'

import { Select, SelectItem } from '@/components/ui/Select'
import { SORT_OPTIONS, type SortKey } from '@/lib/ballot-sorting'

type BallotSortMenuProps = {
    value: SortKey
    onChange: (value: SortKey) => void
}

/** Compact, labeled sort control for the open-poll ballot. */
export function BallotSortMenu({ value, onChange }: BallotSortMenuProps) {
    return (
        <div className="flex w-full items-center gap-2 sm:w-auto">
            <label
                htmlFor="ballot-sort"
                className="select-none whitespace-nowrap text-[0.875rem] text-[color:var(--text-secondary)]"
            >
                Sort by
            </label>
            {/* Select's trigger is w-full; constrain it via a wrapper since cn()
                is plain clsx and can't merge away the w-full. Full width on
                mobile (easy tap target), fixed width on larger screens. */}
            <div className="flex-1 sm:w-[240px] sm:flex-none">
                <Select
                    id="ballot-sort"
                    size="sm"
                    value={value}
                    onValueChange={(v) => onChange(v as SortKey)}
                >
                    {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </Select>
            </div>
        </div>
    )
}
