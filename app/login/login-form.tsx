'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm({
    next,
    error,
}: {
    next: string
    error: string | undefined
}) {
    const [loading, setLoading] = useState(false)

    async function signIn() {
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
                    <p className="text-sm text-neutral-500">revia-meal — HeyRevia lunch polls</p>
                </div>
                {message && (
                    <p className="text-sm text-red-500" role="alert">
                        {message}
                    </p>
                )}
                <button
                    type="button"
                    onClick={signIn}
                    disabled={loading}
                    className="w-full rounded-md bg-black text-white px-4 py-2 font-medium hover:bg-neutral-800 disabled:opacity-50"
                >
                    {loading ? 'Redirecting…' : 'Continue with Google'}
                </button>
            </div>
        </main>
    )
}
