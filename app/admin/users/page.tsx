import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'
import { addUser, updateUser } from './actions'

export default async function UsersPage() {
    const currentAdmin = await requireAdmin()
    const supabase = createAdminClient()
    const { data: users } = await supabase
        .from('users')
        .select('id, email, display_name, role, is_active, created_at')
        .order('created_at', { ascending: true })

    return (
        <main className="p-8 space-y-8 max-w-4xl">
            <header>
                <h1 className="text-2xl font-semibold">Users</h1>
                <p className="text-sm text-neutral-500">
                    Allowlist for sign-in. A user must exist here with <code>active</code> checked
                    before they can log in with Google.
                </p>
            </header>

            <section className="space-y-3">
                <h2 className="text-lg font-medium">Add user</h2>
                <form action={addUser} className="flex flex-wrap gap-2 max-w-xl">
                    <input
                        name="email"
                        type="email"
                        required
                        placeholder="email@example.com"
                        className="flex-1 min-w-[220px] border rounded-md px-3 py-2 bg-transparent"
                    />
                    <select
                        name="role"
                        defaultValue="user"
                        className="border rounded-md px-3 py-2 bg-transparent"
                    >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                    </select>
                    <button
                        type="submit"
                        className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800"
                    >
                        Add
                    </button>
                </form>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-medium">All users ({users?.length ?? 0})</h2>
                <div className="border rounded-md divide-y">
                    {users?.map((u) => {
                        const isSelf = u.id === currentAdmin.id
                        return (
                            <form
                                key={u.id}
                                action={updateUser}
                                className="p-4 flex items-center gap-3 flex-wrap"
                            >
                                <input type="hidden" name="id" value={u.id} />
                                <div className="flex-1 min-w-[220px]">
                                    <div className="font-medium">
                                        {u.email}
                                        {isSelf && (
                                            <span className="ml-2 text-xs text-neutral-500">(you)</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-neutral-500">
                                        added {new Date(u.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <input
                                    name="display_name"
                                    defaultValue={u.display_name ?? ''}
                                    placeholder="display name"
                                    className="border rounded-md px-2 py-1 text-sm bg-transparent"
                                />
                                <select
                                    name="role"
                                    defaultValue={u.role}
                                    disabled={isSelf}
                                    className="border rounded-md px-2 py-1 text-sm bg-transparent disabled:opacity-50"
                                >
                                    <option value="user">user</option>
                                    <option value="admin">admin</option>
                                </select>
                                <label className="flex items-center gap-1 text-sm">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        defaultChecked={u.is_active}
                                        disabled={isSelf}
                                    />
                                    active
                                </label>
                                <button
                                    type="submit"
                                    className="rounded-md border px-3 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
                                >
                                    Save
                                </button>
                            </form>
                        )
                    })}
                </div>
                <p className="text-xs text-neutral-500">
                    You can&apos;t demote or deactivate yourself — make another admin first, or edit the DB directly.
                </p>
            </section>
        </main>
    )
}
