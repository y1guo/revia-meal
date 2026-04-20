'use client'

import { Pencil, ShieldCheck, Trash2, UserMinus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { DestructiveConfirmModal } from '@/components/ui/DestructiveConfirmModal'
import {
    RowActionItem,
    RowActionsMenu,
    RowActionSeparator,
} from '@/components/ui/RowActionsMenu'
import { TableToolbar } from '@/components/ui/TableToolbar'
import { formatDate } from '@/lib/format-time'
import { bulkDelete, bulkSetActive } from './actions'

export type UserRow = {
    id: string
    email: string
    display_name: string | null
    role: 'user' | 'admin'
    is_active: boolean
    created_at: string
    avatar_url: string | null
}

type Props = {
    rows: UserRow[]
    currentAdminId: string
    /** Slot for the primary action and count caption. */
    leading?: React.ReactNode
    trailing?: React.ReactNode
}

export function UsersTable({
    rows,
    currentAdminId,
    leading,
    trailing,
}: Props) {
    const router = useRouter()
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [pending, startTransition] = useTransition()
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
    const [confirmActive, setConfirmActive] = useState<{
        open: boolean
        active: boolean
    }>({ open: false, active: false })

    // When the rows prop changes (pagination, search, filter) drop selected
    // ids that are no longer visible so bulk actions and counts reflect what
    // the user can actually see.
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
        await bulkSetActive(selectedIds, active)
        startTransition(() => {
            clearSelection()
            router.refresh()
        })
    }

    const runBulkDelete = async () => {
        await bulkDelete(selectedIds)
        startTransition(() => {
            clearSelection()
            router.refresh()
        })
    }

    const columns: DataTableColumn<UserRow>[] = [
        {
            id: 'user',
            header: 'User',
            cell: (u) => (
                <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                        name={u.display_name}
                        email={u.email}
                        imageUrl={u.avatar_url}
                        size={32}
                    />
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-[color:var(--text-primary)] truncate">
                                {u.display_name || u.email}
                            </span>
                            {u.id === currentAdminId && (
                                <Chip variant="neutral">you</Chip>
                            )}
                        </div>
                        {u.display_name && (
                            <div className="text-[0.75rem] text-[color:var(--text-secondary)] truncate">
                                {u.email}
                            </div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'role',
            header: 'Role',
            className: 'w-[120px]',
            hideOnMobile: true,
            cell: (u) =>
                u.role === 'admin' ? (
                    <Chip variant="accent">Admin</Chip>
                ) : (
                    <span className="text-[color:var(--text-secondary)]">
                        User
                    </span>
                ),
        },
        {
            id: 'status',
            header: 'Status',
            className: 'w-[120px]',
            cell: (u) =>
                u.is_active ? (
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
            cell: (u) => formatDate(u.created_at),
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
                                          leftIcon={UserMinus}
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
                                      <Button
                                          size="sm"
                                          variant="ghost-destructive"
                                          leftIcon={Trash2}
                                          onClick={() =>
                                              setBulkDeleteOpen(true)
                                          }
                                          disabled={pending}
                                      >
                                          Delete
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

            <DataTable<UserRow>
                columns={columns}
                rows={rows}
                rowKey={(u) => u.id}
                rowHref={(u) => `/admin/users/${u.id}`}
                selectable
                selectedIds={selected}
                onSelectionChange={setSelected}
                isRowSelectable={(u) => u.id !== currentAdminId}
                emptyState={
                    <div className="flex flex-col items-center gap-1">
                        <div className="font-medium text-[color:var(--text-primary)]">
                            No users match.
                        </div>
                        <div className="text-[color:var(--text-secondary)]">
                            Try a different search, or add someone to the
                            allowlist.
                        </div>
                    </div>
                }
                rowActions={(u) => (
                    <RowActionsMenu label={`Actions for ${u.email}`}>
                        <RowActionItem
                            icon={Pencil}
                            onSelect={() => router.push(`/admin/users/${u.id}`)}
                        >
                            Edit
                        </RowActionItem>
                        {u.id !== currentAdminId && (
                            <>
                                <RowActionItem
                                    icon={
                                        u.is_active ? UserMinus : ShieldCheck
                                    }
                                    onSelect={() => {
                                        setSelected(new Set([u.id]))
                                        setConfirmActive({
                                            open: true,
                                            active: !u.is_active,
                                        })
                                    }}
                                >
                                    {u.is_active ? 'Deactivate' : 'Activate'}
                                </RowActionItem>
                                <RowActionSeparator />
                                <RowActionItem
                                    icon={Trash2}
                                    tone="destructive"
                                    onSelect={() => {
                                        setSelected(new Set([u.id]))
                                        setBulkDeleteOpen(true)
                                    }}
                                >
                                    Delete
                                </RowActionItem>
                            </>
                        )}
                    </RowActionsMenu>
                )}
            />

            <DestructiveConfirmModal
                open={bulkDeleteOpen}
                onOpenChange={(o) => {
                    setBulkDeleteOpen(o)
                    if (!o && selected.size === 1) clearSelection()
                }}
                title={
                    selected.size === 1
                        ? 'Delete this user?'
                        : `Delete ${selected.size} users?`
                }
                target={summarize(selectedRows, (r) => r.email)}
                warning="This removes their allowlist entries. Votes, participation records, and API keys are cascaded; poll cancellation attribution is cleared but polls remain."
                destructiveLabel={pending ? 'Deleting…' : 'Delete'}
                onConfirm={runBulkDelete}
            >
                <p>This can&apos;t be undone.</p>
            </DestructiveConfirmModal>

            <DestructiveConfirmModal
                open={confirmActive.open}
                onOpenChange={(o) => {
                    setConfirmActive({ ...confirmActive, open: o })
                    if (!o && selected.size === 1) clearSelection()
                }}
                title={
                    confirmActive.active
                        ? selected.size === 1
                            ? 'Reactivate this user?'
                            : `Reactivate ${selected.size} users?`
                        : selected.size === 1
                          ? 'Deactivate this user?'
                          : `Deactivate ${selected.size} users?`
                }
                target={summarize(selectedRows, (r) => r.email)}
                warning={
                    confirmActive.active
                        ? 'They will be able to sign in again.'
                        : 'They will be blocked from signing in until reactivated.'
                }
                destructiveLabel={
                    pending
                        ? 'Working…'
                        : confirmActive.active
                          ? 'Reactivate'
                          : 'Deactivate'
                }
                onConfirm={() => runBulkActive(confirmActive.active)}
            >
                <p>
                    {confirmActive.active
                        ? 'They can log in with Google again as soon as this takes effect.'
                        : 'Their session stays live until it expires, but they can\u2019t sign in again while deactivated.'}
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
