'use client'

import { UserPlus } from 'lucide-react'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import {
    Modal,
    ModalBody,
    ModalClose,
    ModalFooter,
    ModalIcon,
    ModalTitle,
} from '@/components/ui/Modal'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { TextInput } from '@/components/ui/TextInput'
import { addUser } from './actions'

export function AddUserModal() {
    const [open, setOpen] = useState(false)
    const [pending, startTransition] = useTransition()

    const handleSubmit = async (formData: FormData) => {
        startTransition(async () => {
            await addUser(formData)
            setOpen(false)
        })
    }

    return (
        <>
            <Button
                variant="primary"
                size="sm"
                leftIcon={UserPlus}
                onClick={() => setOpen(true)}
            >
                Add user
            </Button>
            <Modal open={open} onOpenChange={setOpen} showClose>
                <ModalIcon tone="info">
                    <UserPlus size={20} strokeWidth={1.75} />
                </ModalIcon>
                <ModalTitle>Add a user</ModalTitle>
                <ModalBody>
                    <p>
                        Add someone to the allowlist so they can sign in with
                        Google. They&apos;ll be active by default.
                    </p>
                </ModalBody>
                <form action={handleSubmit} className="mt-5 space-y-3">
                    <label className="flex flex-col gap-1">
                        <span className="text-[0.75rem] font-medium text-[color:var(--text-secondary)]">
                            Email
                        </span>
                        <TextInput
                            name="email"
                            type="email"
                            required
                            autoFocus
                            placeholder="email@example.com"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-[0.75rem] font-medium text-[color:var(--text-secondary)]">
                            Role
                        </span>
                        <NativeSelect name="role" defaultValue="user">
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </NativeSelect>
                    </label>
                    <ModalFooter>
                        <ModalClose asChild>
                            <Button variant="ghost" disabled={pending}>
                                Cancel
                            </Button>
                        </ModalClose>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={pending}
                        >
                            Add to allowlist
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>
        </>
    )
}
