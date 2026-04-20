'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { TextInput } from '@/components/ui/TextInput'
import { updateRestaurant } from '../actions'

type Props = {
    restaurant: {
        id: string
        name: string
        doordash_url: string | null
        notes: string | null
        is_active: boolean
    }
}

export function RestaurantEditForm({ restaurant }: Props) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()

    const handleSubmit = async (formData: FormData) => {
        startTransition(async () => {
            await updateRestaurant(formData)
            router.refresh()
        })
    }

    return (
        <Card>
            <h2 className="font-display font-medium text-[1rem] text-[color:var(--text-primary)] mb-4">
                Details
            </h2>
            <form action={handleSubmit} className="space-y-4 max-w-[520px]">
                <input type="hidden" name="id" value={restaurant.id} />
                <label className="flex flex-col gap-1.5">
                    <span className="text-[0.875rem] font-medium text-[color:var(--text-primary)]">
                        Name
                    </span>
                    <TextInput
                        name="name"
                        defaultValue={restaurant.name}
                        required
                    />
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className="text-[0.875rem] font-medium text-[color:var(--text-primary)]">
                        DoorDash URL
                    </span>
                    <TextInput
                        name="doordash_url"
                        type="url"
                        defaultValue={restaurant.doordash_url ?? ''}
                        placeholder="https://www.doordash.com/store/…"
                    />
                    <span className="text-[0.75rem] text-[color:var(--text-secondary)]">
                        Optional. Shown as a link on each poll ballot.
                    </span>
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className="text-[0.875rem] font-medium text-[color:var(--text-primary)]">
                        Notes
                    </span>
                    <TextInput
                        name="notes"
                        defaultValue={restaurant.notes ?? ''}
                        placeholder="e.g. Allergen info, order tips"
                    />
                </label>

                <label className="flex items-start gap-3">
                    <Checkbox
                        name="is_active"
                        defaultChecked={restaurant.is_active}
                        value="on"
                        className="mt-0.5"
                    />
                    <span>
                        <span className="block text-[0.875rem] font-medium text-[color:var(--text-primary)]">
                            Active
                        </span>
                        <span className="block text-[0.75rem] text-[color:var(--text-secondary)]">
                            Inactive restaurants are hidden from new poll
                            ballots. Banked credits users hold for them are
                            preserved.
                        </span>
                    </span>
                </label>

                <div className="pt-2">
                    <Button type="submit" variant="primary" loading={pending}>
                        Save changes
                    </Button>
                </div>
            </form>
        </Card>
    )
}
