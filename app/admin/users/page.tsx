import type { Metadata } from 'next'
import { PageHeader } from '@/components/shell/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { Chip } from '@/components/ui/Chip'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { TextInput } from '@/components/ui/TextInput'
import { cn } from '@/lib/cn'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { addUser, updateUser } from './actions'
import DeleteUserButton from './delete-user-button'

export const metadata: Metadata = { title: 'Users · Admin' }

type UserRow = {
    id: string
    email: string
    display_name: string | null
    role: 'user' | 'admin'
    is_active: boolean
    created_at: string
    avatar_url: string | null
}

export default async function UsersPage() {
    const currentAdmin = await requireAdmin()
    const supabase = createAdminClient()
    // Try with avatar_url; fall back if migration 0002 isn't applied yet.
    const full = await supabase
        .from('users')
        .select(
            'id, email, display_name, role, is_active, created_at, avatar_url',
        )
        .order('created_at', { ascending: true })
    let users: UserRow[]
    if (full.error && /column.*avatar_url/i.test(full.error.message)) {
        const fallback = await supabase
            .from('users')
            .select('id, email, display_name, role, is_active, created_at')
            .order('created_at', { ascending: true })
        users = (fallback.data ?? []).map((u) => ({
            id: u.id as string,
            email: u.email as string,
            display_name: u.display_name as string | null,
            role: u.role as 'user' | 'admin',
            is_active: u.is_active as boolean,
            created_at: u.created_at as string,
            avatar_url: null,
        }))
    } else {
        users = (full.data ?? []).map((u) => ({
            id: u.id as string,
            email: u.email as string,
            display_name: u.display_name as string | null,
            role: u.role as 'user' | 'admin',
            is_active: u.is_active as boolean,
            created_at: u.created_at as string,
            avatar_url:
                ('avatar_url' in u ? (u.avatar_url as string | null) : null) ?? null,
        }))
    }

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
                        <label className="flex flex-col gap-1 w-[140px]">
                            <span className="text-[0.75rem] font-medium text-[color:var(--text-secondary)]">
                                Role
                            </span>
                            <NativeSelect name="role" defaultValue="user">
                                <option value="user">user</option>
                                <option value="admin">admin</option>
                            </NativeSelect>
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
                    {users.map((u) => {
                        const isSelf = u.id === currentAdmin.id
                        return (
                            <li key={u.id}>
                                <Card>
                                    <form
                                        action={updateUser}
                                        className="grid gap-3 md:grid-cols-[2fr_2fr_auto_auto_140px] items-start"
                                    >
                                        <input
                                            type="hidden"
                                            name="id"
                                            value={u.id}
                                        />
                                        <div className="flex items-start gap-3 min-w-0">
                                            <Avatar
                                                name={u.display_name}
                                                email={u.email}
                                                imageUrl={u.avatar_url}
                                                size={36}
                                            />
                                            <div className="min-w-0 flex-1">
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
                                        </div>
                                        <TextInput
                                            name="display_name"
                                            defaultValue={u.display_name ?? ''}
                                            placeholder="Display name"
                                            size="sm"
                                        />
                                        <NativeSelect
                                            name="role"
                                            defaultValue={u.role}
                                            disabled={isSelf}
                                            size="sm"
                                            className="min-w-[100px]"
                                        >
                                            <option value="user">user</option>
                                            <option value="admin">admin</option>
                                        </NativeSelect>
                                        <label
                                            className={cn(
                                                'flex items-center gap-2 text-[0.8125rem] cursor-pointer',
                                                isSelf && 'opacity-50 cursor-not-allowed',
                                            )}
                                        >
                                            <Checkbox
                                                name="is_active"
                                                defaultChecked={u.is_active}
                                                disabled={isSelf}
                                                value="on"
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

