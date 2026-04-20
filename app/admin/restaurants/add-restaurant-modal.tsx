'use client'

import { Store } from 'lucide-react'
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
import { TextInput } from '@/components/ui/TextInput'
import { addRestaurant } from './actions'

export function AddRestaurantModal() {
    const [open, setOpen] = useState(false)
    const [pending, startTransition] = useTransition()

    const handleSubmit = async (formData: FormData) => {
        startTransition(async () => {
            await addRestaurant(formData)
            setOpen(false)
        })
    }

    return (
        <>
            <Button
                variant="primary"
                size="sm"
                leftIcon={Store}
                onClick={() => setOpen(true)}
            >
                Add restaurant
            </Button>
            <Modal open={open} onOpenChange={setOpen} showClose>
                <ModalIcon tone="info">
                    <Store size={20} strokeWidth={1.75} />
                </ModalIcon>
                <ModalTitle>Add a restaurant</ModalTitle>
                <ModalBody>
                    <p>
                        Add it to the shared catalog. You can assign it to
                        individual templates afterwards.
                    </p>
                </ModalBody>
                <form action={handleSubmit} className="mt-5 space-y-3">
                    <label className="flex flex-col gap-1">
                        <span className="text-[0.75rem] font-medium text-[color:var(--text-secondary)]">
                            Name
                        </span>
                        <TextInput name="name" required autoFocus />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-[0.75rem] font-medium text-[color:var(--text-secondary)]">
                            DoorDash URL
                        </span>
                        <TextInput
                            name="doordash_url"
                            type="url"
                            placeholder="https://www.doordash.com/store/…"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-[0.75rem] font-medium text-[color:var(--text-secondary)]">
                            Notes
                        </span>
                        <TextInput
                            name="notes"
                            placeholder="e.g. Allergen info, order tips"
                        />
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
                            Add to catalog
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>
        </>
    )
}
