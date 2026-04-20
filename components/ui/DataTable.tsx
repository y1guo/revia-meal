'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { Checkbox } from '@/components/ui/Checkbox'
import { cn } from '@/lib/cn'

export type DataTableColumn<T> = {
    /** Stable id for the column (used for React key). */
    id: string
    /** Rendered in the thead. Pass a string or any node. */
    header: ReactNode
    /** Render the cell for a given row. */
    cell: (row: T) => ReactNode
    /** Applied to both <th> and <td>. Use for widths, alignment, truncation. */
    className?: string
    /** Hide on small screens. Use for columns that aren't essential on mobile. */
    hideOnMobile?: boolean
}

type DataTableProps<T> = {
    columns: DataTableColumn<T>[]
    rows: T[]
    rowKey: (row: T) => string
    /** If returned, clicking the row navigates here. */
    rowHref?: (row: T) => string | null
    /** Render a per-row actions menu in the trailing cell. */
    rowActions?: (row: T) => ReactNode
    /** Enable multi-select checkboxes. */
    selectable?: boolean
    /** Currently-selected ids (controlled). Pair with onSelectionChange. */
    selectedIds?: Set<string>
    onSelectionChange?: (ids: Set<string>) => void
    /** Disable selection for specific rows (e.g. the current admin can't select themselves). */
    isRowSelectable?: (row: T) => boolean
    /** Rendered inside the table body when rows is empty. */
    emptyState?: ReactNode
    className?: string
}

export function DataTable<T>({
    columns,
    rows,
    rowKey,
    rowHref,
    rowActions,
    selectable = false,
    selectedIds,
    onSelectionChange,
    isRowSelectable,
    emptyState,
    className,
}: DataTableProps<T>) {
    const router = useRouter()
    const selectable_ids = rows
        .filter((r) => !isRowSelectable || isRowSelectable(r))
        .map(rowKey)
    const allSelected =
        selectable_ids.length > 0 &&
        selectable_ids.every((id) => selectedIds?.has(id))
    const someSelected =
        !allSelected &&
        selectable_ids.some((id) => selectedIds?.has(id))

    const toggleAll = () => {
        if (!onSelectionChange) return
        if (allSelected) onSelectionChange(new Set())
        else onSelectionChange(new Set(selectable_ids))
    }

    const toggleRow = (id: string) => {
        if (!onSelectionChange || !selectedIds) return
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        onSelectionChange(next)
    }

    return (
        <div
            className={cn(
                'overflow-hidden',
                'bg-[color:var(--surface-raised)]',
                'border border-[color:var(--border-subtle)]',
                'rounded-[var(--radius-lg)]',
                className,
            )}
        >
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-[color:var(--surface-sunken)]/60">
                            {selectable && (
                                <th
                                    scope="col"
                                    className="w-[44px] px-3 py-3"
                                >
                                    <Checkbox
                                        checked={
                                            allSelected
                                                ? true
                                                : someSelected
                                                  ? 'indeterminate'
                                                  : false
                                        }
                                        onCheckedChange={toggleAll}
                                        disabled={selectable_ids.length === 0}
                                        aria-label="Select all rows"
                                    />
                                </th>
                            )}
                            {columns.map((col) => (
                                <th
                                    key={col.id}
                                    scope="col"
                                    className={cn(
                                        'px-4 py-3',
                                        'text-left',
                                        'text-[0.6875rem] font-medium uppercase tracking-wider',
                                        'text-[color:var(--text-tertiary)]',
                                        col.hideOnMobile && 'hidden md:table-cell',
                                        col.className,
                                    )}
                                >
                                    {col.header}
                                </th>
                            ))}
                            {rowActions && (
                                <th scope="col" className="w-[44px] px-2 py-3" />
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--border-subtle)]">
                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={
                                        columns.length +
                                        (selectable ? 1 : 0) +
                                        (rowActions ? 1 : 0)
                                    }
                                    className="px-4 py-12"
                                >
                                    {emptyState ?? (
                                        <div className="text-center text-[0.875rem] text-[color:var(--text-secondary)]">
                                            No results.
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => {
                                const id = rowKey(row)
                                const href = rowHref?.(row) ?? null
                                const isSelected = selectedIds?.has(id) ?? false
                                const rowSelectable =
                                    !isRowSelectable || isRowSelectable(row)
                                return (
                                    <tr
                                        key={id}
                                        data-selected={isSelected || undefined}
                                        className={cn(
                                            'group',
                                            href && 'cursor-pointer',
                                            'transition-colors duration-75',
                                            'hover:bg-[color:var(--surface-sunken)]/60',
                                            'data-[selected]:bg-[color:var(--accent-brand)]/6',
                                        )}
                                        onClick={(e) => {
                                            if (!href) return
                                            // Ignore clicks that started on interactive descendants.
                                            const target = e.target as HTMLElement
                                            if (
                                                target.closest(
                                                    '[data-row-interactive]',
                                                )
                                            )
                                                return
                                            router.push(href)
                                        }}
                                    >
                                        {selectable && (
                                            <td
                                                className="px-3 py-3 align-middle"
                                                data-row-interactive
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() =>
                                                        toggleRow(id)
                                                    }
                                                    disabled={!rowSelectable}
                                                    aria-label={`Select row ${id}`}
                                                />
                                            </td>
                                        )}
                                        {columns.map((col, colIdx) => {
                                            const content = col.cell(row)
                                            // Wrap the primary (first) column's content in a
                                            // Link so keyboard users can tab to it and screen
                                            // readers find a link. The row-level onClick still
                                            // handles mouse/touch for the rest of the row.
                                            const wrapped =
                                                href && colIdx === 0 ? (
                                                    <Link
                                                        href={href}
                                                        className="block focus:outline-none focus-visible:underline"
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                    >
                                                        {content}
                                                    </Link>
                                                ) : (
                                                    content
                                                )
                                            return (
                                                <td
                                                    key={col.id}
                                                    className={cn(
                                                        'px-4 py-3 align-middle',
                                                        'text-[0.875rem] text-[color:var(--text-primary)]',
                                                        col.hideOnMobile &&
                                                            'hidden md:table-cell',
                                                        col.className,
                                                    )}
                                                >
                                                    {wrapped}
                                                </td>
                                            )
                                        })}
                                        {rowActions && (
                                            <td
                                                className="px-2 py-3 align-middle text-right"
                                                data-row-interactive
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                {rowActions(row)}
                                            </td>
                                        )}
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
