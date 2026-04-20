'use client'

import { AlertCircle, AlertTriangle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
    Modal,
    ModalBody,
    ModalClose,
    ModalFooter,
    ModalIcon,
    ModalTargetChip,
    ModalTitle,
    ModalWarning,
} from '@/components/ui/Modal'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { Textarea } from '@/components/ui/Textarea'
import { overridePollAction } from './actions'

const MAX_REASON_LENGTH = 200

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    pollId: string
    templateName: string
    dateLabel: string
    currentWinnerId: string | null
    currentWinnerName: string | null
    ballot: { id: string; name: string }[]
    onSaved: () => void
}

export function OverrideWinnerModal({
    open,
    onOpenChange,
    pollId,
    templateName,
    dateLabel,
    currentWinnerId,
    currentWinnerName,
    ballot,
    onSaved,
}: Props) {
    const alternatives = useMemo(
        () => ballot.filter((r) => r.id !== currentWinnerId),
        [ballot, currentWinnerId],
    )
    const [newWinnerId, setNewWinnerId] = useState<string>('')
    const [reason, setReason] = useState<string>('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const reset = () => {
        setNewWinnerId('')
        setReason('')
        setError(null)
        setBusy(false)
    }

    const handleSubmit = async () => {
        if (!newWinnerId) return
        setBusy(true)
        setError(null)
        try {
            const fd = new FormData()
            fd.append('poll_id', pollId)
            fd.append('new_winner_id', newWinnerId)
            if (reason.trim()) fd.append('reason', reason.trim())
            await overridePollAction(fd)
            reset()
            onSaved()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Override failed.')
            setBusy(false)
        }
    }

    return (
        <Modal
            open={open}
            onOpenChange={(next) => {
                if (!busy) {
                    if (!next) reset()
                    onOpenChange(next)
                }
            }}
        >
            <ModalIcon tone="destructive">
                <AlertTriangle size={20} strokeWidth={1.75} />
            </ModalIcon>
            <ModalTitle>Override poll winner?</ModalTitle>
            <ModalTargetChip>
                {templateName} — {dateLabel}
            </ModalTargetChip>
            <ModalBody>
                <p>
                    Current winner:{' '}
                    <span className="font-medium text-[color:var(--text-primary)]">
                        {currentWinnerName ?? '(unknown)'}
                    </span>
                </p>

                <label className="block space-y-1.5">
                    <span className="text-[0.8125rem] font-medium text-[color:var(--text-primary)]">
                        New winner
                    </span>
                    <NativeSelect
                        value={newWinnerId}
                        onChange={(e) => setNewWinnerId(e.target.value)}
                        disabled={busy || alternatives.length === 0}
                    >
                        <option value="">Pick a new winner…</option>
                        {alternatives.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.name}
                            </option>
                        ))}
                    </NativeSelect>
                </label>

                <label className="block space-y-1.5">
                    <span className="text-[0.8125rem] font-medium text-[color:var(--text-primary)]">
                        Reason{' '}
                        <span className="font-normal text-[color:var(--text-tertiary)]">
                            (optional)
                        </span>
                    </span>
                    <Textarea
                        value={reason}
                        onChange={(e) =>
                            setReason(e.target.value.slice(0, MAX_REASON_LENGTH))
                        }
                        placeholder="e.g. Boss called Rintaro at the last minute."
                        maxLength={MAX_REASON_LENGTH}
                        disabled={busy}
                    />
                    <span className="block text-[0.75rem] text-[color:var(--text-tertiary)] tabular-nums">
                        {reason.length} / {MAX_REASON_LENGTH}
                    </span>
                </label>

                {error && (
                    <p
                        className="text-[0.8125rem] text-danger-700 dark:text-danger-400"
                        role="alert"
                    >
                        {error}
                    </p>
                )}
            </ModalBody>
            <ModalWarning>
                <AlertCircle
                    size={16}
                    strokeWidth={1.75}
                    className="mt-0.5 shrink-0 text-danger-700 dark:text-danger-400"
                    aria-hidden="true"
                />
                <span>
                    Credits exercised on the current winner return to voters;
                    credits for the new winner are exercised. Undo by
                    overriding again.
                </span>
            </ModalWarning>
            <ModalFooter>
                <ModalClose asChild>
                    <Button variant="ghost" disabled={busy}>
                        Cancel
                    </Button>
                </ModalClose>
                <Button
                    variant="destructive"
                    loading={busy}
                    disabled={!newWinnerId || busy}
                    onClick={handleSubmit}
                >
                    Override winner
                </Button>
            </ModalFooter>
        </Modal>
    )
}
