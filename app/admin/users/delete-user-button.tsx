'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DestructiveConfirmModal } from '@/components/ui/DestructiveConfirmModal'
import { deleteUser } from './actions'

export default function DeleteUserButton({
    userId,
    email,
}: {
    userId: string
    email: string
}) {
    const [open, setOpen] = useState(false)

    const handleConfirm = async () => {
        const fd = new FormData()
        fd.append('id', userId)
        await deleteUser(fd)
    }

    return (
        <>
            <Button
                variant="ghost-destructive"
                size="sm"
                onClick={() => setOpen(true)}
            >
                Delete
            </Button>
            <DestructiveConfirmModal
                open={open}
                onOpenChange={setOpen}
                title="Delete this user?"
                target={email}
                warning="This can't be undone."
                destructiveLabel="Delete user"
                onConfirm={handleConfirm}
            >
                <p>
                    This removes the allowlist entry and cascades: their votes,
                    participation records, and API keys will be deleted.
                    Poll-cancellation attribution will be cleared but the polls
                    themselves remain.
                </p>
            </DestructiveConfirmModal>
        </>
    )
}
