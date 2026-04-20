'use client'

import {
    ExternalLink,
    Pencil,
    ShieldCheck,
    Store,
    UtensilsCrossed,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { DestructiveConfirmModal } from '@/components/ui/DestructiveConfirmModal'
import {
    RowActionItem,
    RowActionsMenu,
} from '@/components/ui/RowActionsMenu'
import { TableToolbar } from '@/components/ui/TableToolbar'
import { bulkSetActiveRestaurants } from './actions'

export type RestaurantRow = {
    id: string
    name: string
    doordash_url: string | null
    notes: string | null
    is_active: boolean
    created_at: string
}

type Props = {
    rows: RestaurantRow[]
    leading?: React.ReactNode
    trailing?: React.ReactNode
}

export function RestaurantsTable({ rows, leading, trailing }: Props) {
    const router = useRouter()
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [pending, startTransition] = useTransition()
    const [confirmActive, setConfirmActive] = useState<{
        open: boolean
        active: boolean
    }>({ open: false, active: false })

    // Drop selected ids that fall off this page after pagination/search.
    const rowIdsKey = rows.map((r) => r.id).join('|')
    const [lastIdsKey, setLastIdsKey] = useState(rowIdsKey)
    if (rowIdsKey !== lastIdsKey) {
        setLastIdsKey(rowIdsKey)
        const visible = new Set(rows.map((r) => r.id))
        setSelected((prev) => {
            let changed = false
            const next = new Set<string>()
            for (const id of prev) {
                if (visible.has(id)) next.add(id)
                else changed = true
            }
            return changed ? next : prev
        })
    }

    const selectedIds = Array.from(selected)
    const selectedRows = rows.filter((r) => selected.has(r.id))
    const clearSelection = () => setSelected(new Set())

    const runBulkActive = async (active: boolean) => {
        await bulkSetActiveRestaurants(selectedIds, active)
        startTransition(() => {
            clearSelection()
            router.refresh()
        })
    }

    const columns: DataTableColumn<RestaurantRow>[] = [
        {
            id: 'name',
            header: 'Restaurant',
            cell: (r) => (
                <div className="flex items-center gap-3 min-w-0">
                    <span
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-sunken)] text-[color:var(--text-secondary)]"
                        aria-hidden="true"
                    >
                        <UtensilsCrossed size={14} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                        <div className="font-medium text-[color:var(--text-primary)] truncate">
                            {r.name}
                        </div>
                        {r.notes && (
                            <div className="text-[0.75rem] text-[color:var(--text-secondary)] truncate">
                                {r.notes}
                            </div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'doordash',
            header: 'DoorDash',
            className: 'w-[120px]',
            hideOnMobile: true,
            cell: (r) =>
                r.doordash_url ? (
                    <a
                        href={r.doordash_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[0.8125rem] text-[color:var(--link-fg)] hover:text-[color:var(--accent-brand)] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        Open
                        <ExternalLink
                            size={12}
                            strokeWidth={1.75}
                            aria-hidden="true"
                        />
                    </a>
                ) : (
                    <span className="text-[color:var(--text-tertiary)]">—</span>
                ),
        },
        {
            id: 'status',
            header: 'Status',
            className: 'w-[120px]',
            cell: (r) =>
                r.is_active ? (
                    <Chip variant="success">Active</Chip>
                ) : (
                    <Chip variant="neutral">Inactive</Chip>
                ),
        },
        {
            id: 'added',
            header: 'Added',
            className: 'w-[140px] text-[color:var(--text-secondary)]',
            hideOnMobile: true,
            cell: (r) =>
                new Date(r.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                }),
        },
    ]

    return (
        <div className="space-y-3">
            <TableToolbar
                bulk={
                    selected.size > 0
                        ? {
                              count: selected.size,
                              onClear: clearSelection,
                              actions: (
                                  <>
                                      <Button
                                          size="sm"
                                          variant="ghost"
                                          leftIcon={ShieldCheck}
                                          onClick={() =>
                                              setConfirmActive({
                                                  open: true,
                                                  active: true,
                                              })
                                          }
                                          disabled={pending}
                                      >
                                          Activate
                                      </Button>
                                      <Button
                                          size="sm"
                                          variant="ghost"
                                          leftIcon={Store}
                                          onClick={() =>
                                              setConfirmActive({
                                                  open: true,
                                                  active: false,
                                              })
                                          }
                                          disabled={pending}
                                      >
                                          Deactivate
                                      </Button>
                                  </>
                              ),
                          }
                        : undefined
                }
                trailing={trailing}
            >
                {leading}
            </TableToolbar>

            <DataTable<RestaurantRow>
                columns={columns}
                rows={rows}
                rowKey={(r) => r.id}
                rowHref={(r) => `/admin/restaurants/${r.id}`}
                selectable
                selectedIds={selected}
                onSelectionChange={setSelected}
                emptyState={
                    <div className="flex flex-col items-center gap-1">
                        <div className="font-medium text-[color:var(--text-primary)]">
                            No restaurants match.
                        </div>
                        <div className="text-[color:var(--text-secondary)]">
                            Try a different search or add one to the catalog.
                        </div>
                    </div>
                }
                rowActions={(r) => (
                    <RowActionsMenu label={`Actions for ${r.name}`}>
                        <RowActionItem
                            icon={Pencil}
                            onSelect={() =>
                                router.push(`/admin/restaurants/${r.id}`)
                            }
                        >
                            Edit
                        </RowActionItem>
                        <RowActionItem
                            icon={r.is_active ? Store : ShieldCheck}
                            onSelect={() => {
                                setSelected(new Set([r.id]))
                                setConfirmActive({
                                    open: true,
                                    active: !r.is_active,
                                })
                            }}
                        >
                            {r.is_active ? 'Deactivate' : 'Activate'}
                        </RowActionItem>
                    </RowActionsMenu>
                )}
            />

            <DestructiveConfirmModal
                open={confirmActive.open}
                onOpenChange={(o) => {
                    setConfirmActive({ ...confirmActive, open: o })
                    if (!o && selected.size === 1) clearSelection()
                }}
                title={
                    confirmActive.active
                        ? selected.size === 1
                            ? 'Activate this restaurant?'
                            : `Activate ${selected.size} restaurants?`
                        : selected.size === 1
                          ? 'Deactivate this restaurant?'
                          : `Deactivate ${selected.size} restaurants?`
                }
                target={summarize(selectedRows, (r) => r.name)}
                warning={
                    confirmActive.active
                        ? 'They will reappear on template ballots where they\u2019re assigned.'
                        : 'They will be hidden from new poll ballots. Banked credits users hold for them are preserved.'
                }
                destructiveLabel={
                    pending
                        ? 'Working…'
                        : confirmActive.active
                          ? 'Activate'
                          : 'Deactivate'
                }
                onConfirm={() => runBulkActive(confirmActive.active)}
            >
                <p>
                    {confirmActive.active
                        ? 'Users will see them on the next poll that opens.'
                        : 'This is reversible — you can reactivate any time.'}
                </p>
            </DestructiveConfirmModal>
        </div>
    )
}

function summarize<T>(rows: T[], label: (r: T) => string): string {
    if (rows.length === 0) return ''
    if (rows.length === 1) return label(rows[0])
    if (rows.length === 2) return `${label(rows[0])} and ${label(rows[1])}`
    return `${label(rows[0])}, ${label(rows[1])}, and ${rows.length - 2} other${rows.length - 2 === 1 ? '' : 's'}`
}
