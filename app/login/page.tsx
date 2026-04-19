import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import LoginForm, { type DevUser } from './login-form'

export const metadata: Metadata = { title: 'Sign in' }

function safeNext(raw: string | undefined): string {
    if (!raw) return '/'
    if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
    return raw
}

function devBypassEnabled(): boolean {
    return (
        process.env.NODE_ENV !== 'production' &&
        process.env.DEV_AUTH_BYPASS === 'true'
    )
}

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ next?: string; error?: string }>
}) {
    const params = await searchParams
    const next = safeNext(params.next)

    const appUser = await getCurrentUser()

    // Fully authed and active — bounce to the intended destination.
    if (appUser && appUser.is_active) {
        redirect(next)
    }

    // Stale session for a deactivated or unknown user: clear it and surface a
    // distinct message when the cause was deactivation.
    let errorOverride: string | undefined
    if (appUser && !appUser.is_active) {
        errorOverride = 'deactivated'
    }

    const supabase = await createClient()
    const {
        data: { user: supabaseUser },
    } = await supabase.auth.getUser()
    if (supabaseUser && (!appUser || !appUser.is_active)) {
        await supabase.auth.signOut()
    }

    // Only fetched when DEV_AUTH_BYPASS is on — never leaks to production.
    let devUsers: DevUser[] | null = null
    if (devBypassEnabled()) {
        const admin = createAdminClient()
        const { data } = await admin
            .from('users')
            .select('email, display_name, role')
            .eq('is_active', true)
            .order('email')
        devUsers = (data ?? []) as DevUser[]
    }

    return (
        <LoginForm
            next={next}
            error={errorOverride ?? params.error}
            devUsers={devUsers}
        />
    )
}
