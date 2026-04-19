import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { signOut } from '../actions'
import CreateKeyForm from './create-key-form'
import RevokeButton from './revoke-button'
import { updateDisplayName } from './actions'

type ApiKeyRow = {
    id: string
    name: string
    created_at: string
    last_used_at: string | null
    revoked_at: string | null
}

export default async function SettingsPage() {
    const user = await requireUser()
    const admin = createAdminClient()
    const { data } = await admin
        .from('api_keys')
        .select('id, name, created_at, last_used_at, revoked_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    const keys = (data ?? []) as ApiKeyRow[]

    return (
        <main className="p-8 space-y-8 max-w-3xl">
            <p className="text-sm">
                <Link href="/" className="underline">
                    ← Today&apos;s polls
                </Link>
            </p>
            <header className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold">Settings</h1>
                    <p className="text-sm text-neutral-500">
                        Signed in as {user.email}
                        {user.role === 'admin' ? ' (admin)' : ''}.
                    </p>
                </div>
                <form action={signOut}>
                    <button
                        type="submit"
                        className="text-sm underline whitespace-nowrap"
                    >
                        Sign out
                    </button>
                </form>
            </header>

            <section className="space-y-3">
                <h2 className="text-lg font-medium">Display name</h2>
                <p className="text-sm text-neutral-500">
                    How your name appears on polls, voter lists, and the
                    People page. Leave blank to fall back to your email.
                </p>
                <form
                    action={updateDisplayName}
                    className="flex gap-2 max-w-xl"
                >
                    <input
                        name="display_name"
                        maxLength={64}
                        defaultValue={user.display_name ?? ''}
                        placeholder={user.email}
                        className="flex-1 border rounded-md px-3 py-2 bg-transparent"
                    />
                    <button
                        type="submit"
                        className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900"
                    >
                        Save
                    </button>
                </form>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-medium">Create an API key</h2>
                <p className="text-sm text-neutral-500">
                    API keys inherit your current role — if you&apos;re an admin,
                    keys created here can call admin endpoints.
                </p>
                <CreateKeyForm />
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-medium">
                    Your keys ({keys.length})
                </h2>
                {keys.length === 0 ? (
                    <p className="text-sm text-neutral-500">
                        No API keys yet.
                    </p>
                ) : (
                    <ul className="border rounded-md divide-y">
                        {keys.map((k) => {
                            const revoked = !!k.revoked_at
                            return (
                                <li
                                    key={k.id}
                                    className={`p-4 flex items-center gap-4 ${
                                        revoked ? 'opacity-60' : ''
                                    }`}
                                >
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium">
                                                {k.name}
                                            </span>
                                            {revoked && (
                                                <span className="text-xs rounded-full px-2 py-0.5 bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                                                    revoked
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-neutral-500">
                                            Created {formatDateTime(k.created_at)}
                                            {' · '}
                                            {k.last_used_at
                                                ? `Last used ${formatDateTime(k.last_used_at)}`
                                                : 'Never used'}
                                            {revoked && (
                                                <>
                                                    {' · '}
                                                    Revoked{' '}
                                                    {formatDateTime(
                                                        k.revoked_at!,
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {!revoked && (
                                        <RevokeButton
                                            keyId={k.id}
                                            name={k.name}
                                        />
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                )}
            </section>
        </main>
    )
}

function formatDateTime(isoString: string): string {
    return new Date(isoString).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    })
}
