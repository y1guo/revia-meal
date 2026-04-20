'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { TextInput } from '@/components/ui/TextInput'
import { cn } from '@/lib/cn'
import { updateUser } from '../actions'

type Props = {
    user: {
        id: string
        email: string
        display_name: string | null
        role: 'user' | 'admin'
        is_active: boolean
    }
    isSelf: boolean
}

export function UserEditForm({ user, isSelf }: Props) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()

    const handleSubmit = async (formData: FormData) => {
        startTransition(async () => {
            await updateUser(formData)
            router.refresh()
        })
    }

    return (
        <Card>
            <h2 className="font-display font-medium text-[1rem] text-[color:var(--text-primary)] mb-4">
                Profile
            </h2>
            <form action={handleSubmit} className="space-y-4 max-w-[520px]">
                <input type="hidden" name="id" value={user.id} />
                <label className="flex flex-col gap-1.5">
                    <span className="text-[0.875rem] font-medium text-[color:var(--text-primary)]">
                        Display name
                    </span>
                    <TextInput
                        name="display_name"
                        defaultValue={user.display_name ?? ''}
                        placeholder={user.email}
                        maxLength={64}
                    />
                    <span className="text-[0.75rem] text-[color:var(--text-secondary)]">
                        Shown on polls, voter lists, and the People page.
                    </span>
                </label>

                <label
                    className={cn(
                        'flex flex-col gap-1.5',
                        isSelf && 'opacity-60',
                    )}
                >
                    <span className="text-[0.875rem] font-medium text-[color:var(--text-primary)]">
                        Role
                    </span>
                    <NativeSelect
                        name="role"
                        defaultValue={user.role}
                        disabled={isSelf}
                        className="max-w-[200px]"
                    >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </NativeSelect>
                    {isSelf && (
                        <span className="text-[0.75rem] text-[color:var(--text-secondary)]">
                            You can&apos;t change your own role. Ask another admin.
                        </span>
                    )}
                </label>

                <label
                    className={cn(
                        'flex items-start gap-3',
                        isSelf && 'opacity-60 cursor-not-allowed',
                    )}
                >
                    <Checkbox
                        name="is_active"
                        defaultChecked={user.is_active}
                        disabled={isSelf}
                        value="on"
                        className="mt-0.5"
                    />
                    <span>
                        <span className="block text-[0.875rem] font-medium text-[color:var(--text-primary)]">
                            Active
                        </span>
                        <span className="block text-[0.75rem] text-[color:var(--text-secondary)]">
                            {isSelf
                                ? 'You can\u2019t deactivate yourself. Ask another admin.'
                                : 'Inactive users can\u2019t sign in with Google until reactivated.'}
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
