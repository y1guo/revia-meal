'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DestructiveConfirmModal } from '@/components/ui/DestructiveConfirmModal'
import { revokeApiKey } from './actions'

export default function RevokeButton({
    keyId,
    name,
}: {
    keyId: string
    name: string
}) {
    const [open, setOpen] = useState(false)

    const handleConfirm = async () => {
        const fd = new FormData()
        fd.append('key_id', keyId)
        await revokeApiKey(fd)
    }

    return (
        <>
            <Button
                variant="ghost-destructive"
                size="sm"
                onClick={() => setOpen(true)}
            >
                Revoke
            </Button>
            <DestructiveConfirmModal
                open={open}
                onOpenChange={setOpen}
                title="Revoke this key?"
                target={name}
                warning="This can't be undone."
                destructiveLabel="Revoke key"
                onConfirm={handleConfirm}
            >
                <p>
                    Any calls using this key will start failing immediately.
                    You can&apos;t restore a revoked key — you&apos;ll have to
                    create a new one.
                </p>
            </DestructiveConfirmModal>
        </>
    )
}
