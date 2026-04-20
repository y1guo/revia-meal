'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DestructiveConfirmModal } from '@/components/ui/DestructiveConfirmModal'
import { deleteUser } from '../actions'

export function DeleteUserCard({
    id,
    email,
}: {
    id: string
    email: string
}) {
    const router = useRouter()
    const [open, setOpen] = useState(false)

    const onConfirm = async () => {
        const fd = new FormData()
        fd.append('id', id)
        await deleteUser(fd)
        router.push('/admin/users')
    }

    return (
        <>
            <Card className="border-danger-500/30 bg-danger-500/[0.02]">
                <div className="flex flex-wrap items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <h2 className="font-display font-medium text-[1rem] text-[color:var(--text-primary)] mb-1">
                            Delete user
                        </h2>
                        <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
                            Removes the allowlist entry. Their votes,
                            participation records, and API keys are cascaded.
                            Poll-cancellation attribution is cleared but the
                            polls themselves remain. Can&apos;t be undone.
                        </p>
                    </div>
                    <Button
                        variant="destructive"
                        leftIcon={Trash2}
                        onClick={() => setOpen(true)}
                    >
                        Delete user
                    </Button>
                </div>
            </Card>
            <DestructiveConfirmModal
                open={open}
                onOpenChange={setOpen}
                title="Delete this user?"
                target={email}
                warning="This can't be undone."
                destructiveLabel="Delete user"
                onConfirm={onConfirm}
            >
                <p>
                    This removes the allowlist entry and cascades: their votes,
                    participation records, and API keys will be deleted.
                </p>
            </DestructiveConfirmModal>
        </>
    )
}
