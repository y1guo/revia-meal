'use client'

import { AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { Brand } from '@/components/shell/Brand'
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
                <div className="flex justify-center">
                    <Brand href="#" />
                </div>
                {/* TODO(illustration): replace with a Storyset "Food & Drink"
                    asset per docs/design/pages.md §/login. */}
                <div
                    className={cn(
                        'mx-auto flex h-[160px] w-[160px] items-center justify-center',
                        'rounded-full bg-[color:var(--surface-raised)]',
                        'text-[3rem]',
                    )}
                    aria-hidden="true"
                >
                    🍱
                </div>
                <div className="space-y-2 text-center">
                    <h1 className="font-display font-medium text-[1.25rem] text-[color:var(--text-primary)]">
                        Lunch, decided together.
                    </h1>
                    <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
                        Only emails on the office allowlist can sign in.
                    </p>
                </div>
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
