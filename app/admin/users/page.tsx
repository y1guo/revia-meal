import type { Metadata } from 'next'
import { PageHeader } from '@/components/shell/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { TextInput } from '@/components/ui/TextInput'
import { cn } from '@/lib/cn'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { addUser, updateUser } from './actions'
import DeleteUserButton from './delete-user-button'

export const metadata: Metadata = { title: 'Users · Admin' }

export default async function UsersPage() {
    const currentAdmin = await requireAdmin()
    const supabase = createAdminClient()
    const { data: users } = await supabase
        .from('users')
        .select('id, email, display_name, role, is_active, created_at')
        .order('created_at', { ascending: true })

    return (
        <>
            <PageHeader
                title="Users"
                subtitle={
                    <>
                        Allowlist for sign-in. A user must exist here with{' '}
                        <code className="font-mono text-[0.8125rem] bg-[color:var(--surface-sunken)] px-1.5 py-0.5 rounded">
                            active
                        </code>{' '}
                        checked before they can log in with Google.
                    </>
                }
            />

            <div className="space-y-6">
                <Card>
                    <h2 className="font-display font-medium text-[1rem] text-[color:var(--text-primary)] mb-3">
                        Add user
                    </h2>
                    <form
                        action={addUser}
                        className="flex flex-wrap gap-2 items-end"
                    >
                        <label className="flex-1 min-w-[220px] flex flex-col gap-1">
                            <span className="text-[0.75rem] font-medium text-[color:var(--text-secondary)]">
                                Email
                            </span>
                            <TextInput
                                name="email"
                                type="email"
                                required
                                placeholder="email@example.com"
                            />
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="text-[0.75rem] font-medium text-[color:var(--text-secondary)]">
                                Role
                            </span>
                            <AdminNativeSelect name="role" defaultValue="user">
                                <option value="user">user</option>
                                <option value="admin">admin</option>
                            </AdminNativeSelect>
                        </label>
                        <Button type="submit" variant="primary">
                            Add to allowlist
                        </Button>
                    </form>
                </Card>

                <div className="flex items-center justify-between">
                    <h2 className="font-display font-medium text-[1rem] text-[color:var(--text-primary)]">
                        Allowlist · {users?.length ?? 0}{' '}
                        {users?.length === 1 ? 'person' : 'people'}
                    </h2>
                </div>

                <ul className="space-y-3">
                    {users?.map((u) => {
                        const isSelf = u.id === currentAdmin.id
                        return (
                            <li key={u.id}>
                                <Card>
                                    <form
                                        action={updateUser}
                                        className="grid gap-3 md:grid-cols-[2fr_2fr_auto_auto_auto]"
                                    >
                                        <input
                                            type="hidden"
                                            name="id"
                                            value={u.id}
                                        />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-[color:var(--text-primary)] truncate">
                                                    {u.email}
                                                </span>
                                                {isSelf && (
                                                    <Chip variant="neutral">
                                                        you
                                                    </Chip>
                                                )}
                                            </div>
                                            <div className="text-[0.75rem] text-[color:var(--text-secondary)]">
                                                Added{' '}
                                                {new Date(
                                                    u.created_at,
                                                ).toLocaleDateString(
                                                    undefined,
                                                    {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    },
                                                )}
                                            </div>
                                        </div>
                                        <TextInput
                                            name="display_name"
                                            defaultValue={u.display_name ?? ''}
                                            placeholder="Display name"
                                            size="sm"
                                        />
                                        <AdminNativeSelect
                                            name="role"
                                            defaultValue={u.role}
                                            disabled={isSelf}
                                            className="min-w-[100px]"
                                        >
                                            <option value="user">user</option>
                                            <option value="admin">admin</option>
                                        </AdminNativeSelect>
                                        <label
                                            className={cn(
                                                'flex items-center gap-1.5 text-[0.8125rem]',
                                                isSelf && 'opacity-50',
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                name="is_active"
                                                defaultChecked={u.is_active}
                                                disabled={isSelf}
                                                className="h-4 w-4 accent-[color:var(--accent-brand)]"
                                            />
                                            Active
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <Button type="submit" size="sm">
                                                Save
                                            </Button>
                                            {!isSelf && (
                                                <DeleteUserButton
                                                    userId={u.id}
                                                    email={u.email}
                                                />
                                            )}
                                        </div>
                                    </form>
                                </Card>
                            </li>
                        )
                    })}
                </ul>
                <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
                    You can&apos;t demote or deactivate yourself — make another
                    admin first, or edit the DB directly.
                </p>
            </div>
        </>
    )
}

function AdminNativeSelect({
    className,
    ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...rest}
            className={cn(
                'h-9 px-2.5 rounded-[var(--radius-md)]',
                'bg-[color:var(--surface-raised)]',
                'border border-[color:var(--border-subtle)]',
                'text-[0.875rem] text-[color:var(--text-primary)]',
                'focus:border-[color:var(--accent-brand)]',
                'disabled:opacity-50',
                className,
            )}
        />
    )
}
