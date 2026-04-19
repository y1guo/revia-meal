'use client'

import { AlertCircle, UtensilsCrossed } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/cn'
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
            ? "This email isn't on the office allowlist. Ask an admin if you think that's a mistake."
            : error === 'deactivated'
              ? 'Your account is deactivated. Reach out to an admin to re-enable it.'
              : error
                ? 'Something went wrong with Google sign-in. Try again.'
                : null

    return (
        <main className="relative flex flex-1 items-center justify-center p-4">
            <div className="absolute top-4 right-4">
                <ThemeToggle size="sm" iconsOnly />
            </div>
            <div className="w-full max-w-[400px] space-y-6">
                <div className="flex flex-col items-center gap-3">
                    <div
                        aria-hidden="true"
                        className={cn(
                            'flex items-center justify-center',
                            'h-24 w-24 rounded-full mb-1',
                            'bg-gradient-to-br from-[color:var(--accent-brand)]/20 to-[color:var(--accent-brand)]/5',
                            'text-[color:var(--accent-brand)]',
                            'shadow-[var(--shadow-card-rest)]',
                        )}
                    >
                        <UtensilsCrossed size={44} strokeWidth={1.5} />
                    </div>
                    {/* Wordmark ships as white-on-transparent. In light mode we
                        invert brightness to make it legible on cream. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/brand/wordmark.png"
                        alt="HeyRevia"
                        width={240}
                        height={73}
                        className="h-[52px] w-auto brightness-0 dark:brightness-100"
                    />
                    <h1 className="font-display font-semibold tracking-tight text-[2rem] text-[color:var(--text-primary)]">
                        Meal
                    </h1>
                </div>
                <p className="text-center text-[0.9375rem] text-[color:var(--text-secondary)]">
                    Office lunch polls. Only emails on the allowlist can sign
                    in.
                </p>
                {message && (
                    <div
                        role="alert"
                        className={cn(
                            'flex items-start gap-2 rounded-[var(--radius-md)]',
                            'border border-tomato-500/30 bg-tomato-500/5',
                            'px-4 py-3',
                        )}
                    >
                        <AlertCircle
                            size={16}
                            strokeWidth={1.75}
                            className="mt-0.5 shrink-0 text-tomato-500"
                            aria-hidden="true"
                        />
                        <p className="text-[0.8125rem] text-[color:var(--text-primary)]">
                            {message}
                        </p>
                    </div>
                )}
                <Button
                    variant="primary"
                    size="lg"
                    onClick={signInWithGoogle}
                    loading={loading}
                    className="w-full"
                >
                    {loading ? 'Redirecting…' : 'Sign in with Google'}
                </Button>

                {devUsers && (
                    <div className="space-y-3 border-t border-[color:var(--border-subtle)] pt-4">
                        <div>
                            <h2 className="text-[0.875rem] font-medium text-[color:var(--text-primary)]">
                                Dev sign-in
                            </h2>
                            <p className="text-[0.75rem] text-[color:var(--text-secondary)]">
                                Enabled by{' '}
                                <code className="font-mono">DEV_AUTH_BYPASS=true</code>
                                . Bypasses Google and mints a Supabase session
                                directly. Disabled when{' '}
                                <code className="font-mono">NODE_ENV=production</code>
                                .
                            </p>
                        </div>
                        {devUsers.length === 0 ? (
                            <p className="text-[0.75rem] text-[color:var(--text-secondary)]">
                                No active allowlisted users.
                            </p>
                        ) : (
                            <ul className="space-y-1.5">
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
                                                className={cn(
                                                    'w-full text-left',
                                                    'rounded-[var(--radius-md)] border border-[color:var(--border-subtle)]',
                                                    'bg-[color:var(--surface-raised)] hover:bg-[color:var(--surface-sunken)]',
                                                    'px-3 py-2',
                                                    'transition-colors duration-150',
                                                )}
                                            >
                                                <div className="text-[0.875rem] text-[color:var(--text-primary)]">
                                                    {u.display_name ?? u.email}
                                                    {u.role === 'admin' && (
                                                        <span className="ml-1.5 text-[0.75rem] text-[color:var(--text-secondary)]">
                                                            (admin)
                                                        </span>
                                                    )}
                                                </div>
                                                {u.display_name && (
                                                    <div className="text-[0.75rem] text-[color:var(--text-secondary)]">
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
