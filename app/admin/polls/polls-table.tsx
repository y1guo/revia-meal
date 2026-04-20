'use client'

import { ExternalLink, ListChecks, Shuffle, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { DestructiveConfirmModal } from '@/components/ui/DestructiveConfirmModal'
import {
    RowActionItem,
    RowActionsMenu,
} from '@/components/ui/RowActionsMenu'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { PollStatus } from '@/lib/polls'
import { cancelPollAction } from './actions'
import { EditBallotModal } from './edit-ballot-modal'
import { OverrideWinnerModal } from './override-winner-modal'

export type PollTableRow = {
    id: string
    templateName: string
    dateLabel: string
    status: PollStatus
    voters: number
    winnerId: string | null
    winnerName: string | null
    cancelledReason: 'admin' | 'no_votes' | 'no_available_restaurants' | null
    cancelledByLabel: string | null
    /** Ballot restaurants for closed polls; null otherwise. Used by the
     *  override-winner modal to offer alternatives. */
    ballot: { id: string; name: string }[] | null
    /** Full ballot (active + disabled) for scheduled/open polls; null
     *  otherwise. Used by the edit-ballot modal. */
    editableBallot:
        | { id: string; name: string; disabled: boolean }[]
        | null
}

export type CatalogEntry = { id: string; name: string }

export function PollsTable({
    rows,
    catalog,
}: {
    rows: PollTableRow[]
    catalog: CatalogEntry[]
}) {
    const router = useRouter()
    const [cancelTarget, setCancelTarget] = useState<PollTableRow | null>(null)
    const [overrideTarget, setOverrideTarget] = useState<PollTableRow | null>(
        null,
    )
    const [editBallotTarget, setEditBallotTarget] =
        useState<PollTableRow | null>(null)

    const handleCancel = async () => {
        if (!cancelTarget) return
        const fd = new FormData()
        fd.append('poll_id', cancelTarget.id)
        await cancelPollAction(fd)
        router.refresh()
    }

    const columns: DataTableColumn<PollTableRow>[] = [
        {
            id: 'template',
            header: 'Poll',
            cell: (p) => (
                <div className="min-w-0">
                    <div className="font-medium text-[color:var(--text-primary)] truncate">
                        {p.templateName}
                    </div>
                    <div className="text-[0.75rem] text-[color:var(--text-secondary)] truncate tabular-nums">
                        {p.dateLabel}
                        <span className="md:hidden">
                            {' · '}
                            {p.voters}{' '}
                            {p.voters === 1 ? 'voter' : 'voters'}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            id: 'status',
            header: 'Status',
            className: 'w-[140px]',
            cell: (p) => <StatusBadge status={p.status} />,
        },
        {
            id: 'voters',
            header: 'Voters',
            className: 'w-[90px] tabular-nums',
            hideOnMobile: true,
            cell: (p) => (
                <span className="text-[color:var(--text-primary)]">
                    {p.voters}
                </span>
            ),
        },
        {
            id: 'winner',
            header: 'Winner',
            className: 'w-[220px]',
            hideOnMobile: true,
            cell: (p) => {
                if (p.status === 'closed' && p.winnerName)
                    return (
                        <span className="font-medium text-[color:var(--text-primary)] truncate block">
                            {p.winnerName}
                        </span>
                    )
                if (p.status === 'cancelled')
                    return (
                        <span className="text-[0.8125rem] text-[color:var(--status-cancelled-fg)]">
                            {p.cancelledReason === 'no_votes'
                                ? 'No votes'
                                : p.cancelledReason ===
                                    'no_available_restaurants'
                                  ? 'No available restaurants'
                                  : p.cancelledByLabel
                                    ? `by ${p.cancelledByLabel}`
                                    : 'by admin'}
                        </span>
                    )
                return <span className="text-[color:var(--text-tertiary)]">—</span>
            },
        },
    ]

    return (
        <>
            <DataTable<PollTableRow>
                columns={columns}
                rows={rows}
                rowKey={(p) => p.id}
                rowHref={(p) => `/polls/${p.id}`}
                emptyState={
                    <div className="flex flex-col items-center gap-1">
                        <div className="font-medium text-[color:var(--text-primary)]">
                            No polls match these filters.
                        </div>
                        <div className="text-[color:var(--text-secondary)]">
                            Widen the date range or clear filters.
                        </div>
                    </div>
                }
                rowActions={(p) => (
                    <RowActionsMenu label={`Actions for ${p.templateName}`}>
                        <RowActionItem
                            icon={ExternalLink}
                            onSelect={() => router.push(`/polls/${p.id}`)}
                        >
                            View poll
                        </RowActionItem>
                        {(p.status === 'scheduled' || p.status === 'open') &&
                            p.editableBallot && (
                                <RowActionItem
                                    icon={ListChecks}
                                    onSelect={() => setEditBallotTarget(p)}
                                >
                                    Edit ballot…
                                </RowActionItem>
                            )}
                        {p.status === 'closed' && p.ballot && p.ballot.length > 1 && (
                            <RowActionItem
                                icon={Shuffle}
                                onSelect={() => setOverrideTarget(p)}
                            >
                                Override winner…
                            </RowActionItem>
                        )}
                        {p.status !== 'cancelled' && (
                            <RowActionItem
                                icon={XCircle}
                                tone="destructive"
                                onSelect={() => setCancelTarget(p)}
                            >
                                Cancel poll
                            </RowActionItem>
                        )}
                    </RowActionsMenu>
                )}
            />

            <DestructiveConfirmModal
                open={cancelTarget !== null}
                onOpenChange={(o) => {
                    if (!o) setCancelTarget(null)
                }}
                title="Cancel this poll?"
                target={
                    cancelTarget
                        ? `${cancelTarget.templateName} — ${cancelTarget.dateLabel}`
                        : ''
                }
                warning="This can't be undone."
                destructiveLabel="Cancel poll"
                onConfirm={handleCancel}
            >
                <p>
                    {cancelTarget?.status === 'closed'
                        ? 'The winner will be voided and every exercised credit will return to its voter. Use this only if the result is genuinely wrong.'
                        : 'Voting stops immediately. Any credits consumed today come back, participation locks are released, and the poll is marked cancelled. The row itself is preserved.'}
                </p>
            </DestructiveConfirmModal>

            {overrideTarget && overrideTarget.ballot && (
                <OverrideWinnerModal
                    open={overrideTarget !== null}
                    onOpenChange={(o) => {
                        if (!o) setOverrideTarget(null)
                    }}
                    pollId={overrideTarget.id}
                    templateName={overrideTarget.templateName}
                    dateLabel={overrideTarget.dateLabel}
                    currentWinnerId={overrideTarget.winnerId}
                    currentWinnerName={overrideTarget.winnerName}
                    ballot={overrideTarget.ballot}
                    onSaved={() => {
                        setOverrideTarget(null)
                        router.refresh()
                    }}
                />
            )}

            {editBallotTarget && editBallotTarget.editableBallot && (
                <EditBallotModal
                    open={editBallotTarget !== null}
                    onOpenChange={(o) => {
                        if (!o) setEditBallotTarget(null)
                    }}
                    pollId={editBallotTarget.id}
                    templateName={editBallotTarget.templateName}
                    dateLabel={editBallotTarget.dateLabel}
                    currentBallot={editBallotTarget.editableBallot}
                    catalog={catalog}
                    onSaved={() => {
                        setEditBallotTarget(null)
                        router.refresh()
                    }}
                />
            )}
        </>
    )
}
