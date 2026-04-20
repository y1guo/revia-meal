'use client'

import { ListChecks } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import {
    Modal,
    ModalBody,
    ModalClose,
    ModalFooter,
    ModalIcon,
    ModalTargetChip,
    ModalTitle,
} from '@/components/ui/Modal'
import { cn } from '@/lib/cn'
import { editBallotAction } from './actions'

type CurrentBallotEntry = { id: string; name: string; disabled: boolean }
type CatalogEntry = { id: string; name: string }

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    pollId: string
    templateName: string
    dateLabel: string
    currentBallot: CurrentBallotEntry[]
    catalog: CatalogEntry[]
    onSaved: () => void
}

export function EditBallotModal({
    open,
    onOpenChange,
    pollId,
    templateName,
    dateLabel,
    currentBallot,
    catalog,
    onSaved,
}: Props) {
    // Build the master list: every active catalog restaurant, annotated
    // with whether it's currently on the ballot and whether it's
    // previously-disabled.
    const { rows, initialActive } = useMemo(() => {
        const disabledOnBallot = new Set(
            currentBallot.filter((b) => b.disabled).map((b) => b.id),
        )
        const activeOnBallot = new Set(
            currentBallot.filter((b) => !b.disabled).map((b) => b.id),
        )
        const list: Array<CatalogEntry & { previouslyRemoved: boolean }> =
            catalog.map((c) => ({
                ...c,
                previouslyRemoved: disabledOnBallot.has(c.id),
            }))
        list.sort((a, b) => a.name.localeCompare(b.name))
        return {
            rows: list,
            initialActive: activeOnBallot,
        }
    }, [catalog, currentBallot])

    const [selected, setSelected] = useState<Set<string>>(
        () => new Set(initialActive),
    )
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const diff = useMemo(() => {
        const added: string[] = []
        const removed: string[] = []
        for (const r of rows) {
            const wasActive = initialActive.has(r.id)
            const nowActive = selected.has(r.id)
            if (nowActive && !wasActive) added.push(r.id)
            if (!nowActive && wasActive) removed.push(r.id)
        }
        return { added, removed }
    }, [rows, initialActive, selected])

    const toggle = (id: string, next: boolean) => {
        setSelected((prev) => {
            const out = new Set(prev)
            if (next) out.add(id)
            else out.delete(id)
            return out
        })
    }

    const reset = () => {
        setSelected(new Set(initialActive))
        setError(null)
        setBusy(false)
    }

    const handleSubmit = async () => {
        if (diff.added.length === 0 && diff.removed.length === 0) return
        if (selected.size === 0) {
            setError(
                "Can't disable the entire ballot. Cancel the poll instead.",
            )
            return
        }
        setBusy(true)
        setError(null)
        try {
            const fd = new FormData()
            fd.append('poll_id', pollId)
            for (const id of diff.added) fd.append('added', id)
            for (const id of diff.removed) fd.append('removed', id)
            await editBallotAction(fd)
            reset()
            onSaved()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Edit failed.')
            setBusy(false)
        }
    }

    const activeCount = selected.size

    return (
        <Modal
            open={open}
            onOpenChange={(next) => {
                if (!busy) {
                    if (!next) reset()
                    onOpenChange(next)
                }
            }}
            className="max-w-[560px]"
        >
            <ModalIcon tone="info">
                <ListChecks size={20} strokeWidth={1.75} />
            </ModalIcon>
            <ModalTitle>Edit ballot</ModalTitle>
            <ModalTargetChip>
                {templateName} — {dateLabel}
            </ModalTargetChip>
            <ModalBody>
                <p>
                    Check which restaurants appear on this poll&apos;s ballot.
                    Removing one keeps existing votes visible to their voter
                    (who can unvote) but excludes it from winner selection.
                    Votes on removed restaurants still accrue to that
                    restaurant&apos;s credit bank.
                </p>

                <ul className="max-h-[320px] overflow-y-auto rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] divide-y divide-[color:var(--border-subtle)]">
                    {rows.map((r) => {
                        const checked = selected.has(r.id)
                        return (
                            <li key={r.id}>
                                <label
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2',
                                        busy
                                            ? 'cursor-not-allowed opacity-60'
                                            : 'cursor-pointer hover:bg-[color:var(--surface-sunken)]',
                                        'transition-colors duration-150',
                                    )}
                                >
                                    <Checkbox
                                        checked={checked}
                                        disabled={busy}
                                        onCheckedChange={(next) =>
                                            toggle(r.id, next === true)
                                        }
                                    />
                                    <span className="flex-1 min-w-0 text-[0.875rem] text-[color:var(--text-primary)] truncate">
                                        {r.name}
                                    </span>
                                    {r.previouslyRemoved && !checked && (
                                        <span className="text-[0.6875rem] uppercase tracking-wide text-[color:var(--text-tertiary)]">
                                            removed
                                        </span>
                                    )}
                                    {r.previouslyRemoved && checked && (
                                        <span className="text-[0.6875rem] uppercase tracking-wide text-[color:var(--accent-brand)]">
                                            reactivating
                                        </span>
                                    )}
                                </label>
                            </li>
                        )
                    })}
                </ul>

                <p className="text-[0.8125rem] text-[color:var(--text-secondary)] tabular-nums">
                    {activeCount} active
                    {diff.added.length + diff.removed.length > 0 && (
                        <>
                            {' · '}
                            {diff.added.length > 0 && (
                                <span className="text-[color:var(--status-open-fg)]">
                                    +{diff.added.length} added
                                </span>
                            )}
                            {diff.added.length > 0 && diff.removed.length > 0 && ', '}
                            {diff.removed.length > 0 && (
                                <span className="text-[color:var(--status-cancelled-fg)]">
                                    −{diff.removed.length} removed
                                </span>
                            )}
                        </>
                    )}
                </p>

                {error && (
                    <p
                        className="text-[0.8125rem] text-danger-700 dark:text-danger-400"
                        role="alert"
                    >
                        {error}
                    </p>
                )}
            </ModalBody>
            <ModalFooter>
                <ModalClose asChild>
                    <Button variant="ghost" disabled={busy}>
                        Cancel
                    </Button>
                </ModalClose>
                <Button
                    variant="primary"
                    loading={busy}
                    disabled={
                        busy ||
                        (diff.added.length === 0 && diff.removed.length === 0)
                    }
                    onClick={handleSubmit}
                >
                    Save changes
                </Button>
            </ModalFooter>
        </Modal>
    )
}
