'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DestructiveConfirmModal } from '@/components/ui/DestructiveConfirmModal'
import { cancelPollAction } from './actions'

export default function CancelButton({
    pollId,
    label,
    isClosed,
}: {
    pollId: string
    label: string
    isClosed?: boolean
}) {
    const [open, setOpen] = useState(false)

    const handleConfirm = async () => {
        const fd = new FormData()
        fd.append('poll_id', pollId)
        await cancelPollAction(fd)
    }

    return (
        <>
            <Button
                variant="ghost-destructive"
                size="sm"
                onClick={() => setOpen(true)}
            >
                Cancel
            </Button>
            <DestructiveConfirmModal
                open={open}
                onOpenChange={setOpen}
                title="Cancel this poll?"
                target={label}
                warning="This can't be undone."
                destructiveLabel="Cancel poll"
                onConfirm={handleConfirm}
            >
                <p>
                    {isClosed
                        ? 'The winner will be voided and every exercised credit will return to its voter. Use this only if the result is genuinely wrong.'
                        : 'Voting stops immediately. Any credits consumed today come back, participation locks are released, and the poll is marked cancelled. The row itself is preserved.'}
                </p>
            </DestructiveConfirmModal>
        </>
    )
}
