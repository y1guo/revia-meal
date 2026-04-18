'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { devSignIn } from './actions'

export type DevUser = {
    email: string
    display_name: string | null
    role: string
}

export default function LoginForm({
    next,
    error,
    devUsers,
}: {
    next: string
    error: string | undefined
    devUsers: DevUser[] | null
}) {
    const [loading, setLoading] = useState(false)

    async function signInWithGoogle() {
        setLoading(true)
        const supabase = createClient()
        const { error: signInError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
            },
        })
        if (signInError) setLoading(false)
    }

    const message =
        error === 'not_authorized'
            ? "Your email isn't on the allowlist. Ask an admin to add you."
            : error === 'deactivated'
              ? 'Your account has been deactivated. Ask an admin to re-enable it.'
              : error
                ? 'Sign-in failed. Please try again.'
                : null

    return (
        <main className="min-h-screen flex items-center justify-center p-8">
            <div className="w-full max-w-sm space-y-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold">Sign in</h1>
                    <p className="text-sm text-neutral-500">
                        revia-meal — HeyRevia lunch polls
                    </p>
                </div>
                {message && (
                    <p className="text-sm text-red-500" role="alert">
                        {message}
                    </p>
                )}
                <button
                    type="button"
                    onClick={signInWithGoogle}
                    disabled={loading}
                    className="w-full rounded-md bg-black text-white px-4 py-2 font-medium hover:bg-neutral-800 disabled:opacity-50"
                >
                    {loading ? 'Redirecting…' : 'Continue with Google'}
                </button>

                {devUsers && (
                    <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 space-y-3">
                        <div>
                            <h2 className="text-sm font-medium">Dev sign-in</h2>
                            <p className="text-xs text-neutral-500">
                                Enabled by <code>DEV_AUTH_BYPASS=true</code>. Bypasses
                                Google and mints a Supabase session directly. Disabled
                                automatically when <code>NODE_ENV=production</code>.
                            </p>
                        </div>
                        {devUsers.length === 0 ? (
                            <p className="text-xs text-neutral-500">
                                No active allowlisted users.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {devUsers.map((u) => (
                                    <li key={u.email}>
                                        <form action={devSignIn}>
                                            <input
                                                type="hidden"
                                                name="email"
                                                value={u.email}
                                            />
                                            <input
                                                type="hidden"
                                                name="next"
                                                value={next}
                                            />
                                            <button
                                                type="submit"
                                                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm text-left hover:bg-neutral-100 dark:hover:bg-neutral-900"
                                            >
                                                <div>
                                                    {u.display_name ?? u.email}
                                                    {u.role === 'admin' && (
                                                        <span className="ml-1 text-xs text-neutral-500">
                                                            (admin)
                                                        </span>
                                                    )}
                                                </div>
                                                {u.display_name && (
                                                    <div className="text-xs text-neutral-500">
                                                        {u.email}
                                                    </div>
                                                )}
                                            </button>
                                        </form>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </main>
    )
}
