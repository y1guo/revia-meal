import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import LoginForm from './login-form'

function safeNext(raw: string | undefined): string {
    if (!raw) return '/'
    if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
    return raw
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

    // Otherwise: if there's a Supabase session but no valid active app user,
    // clear it so the user can cleanly sign in again. Surface a distinct
    // message if the cause was deactivation (vs. allowlist removal).
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

    return <LoginForm next={next} error={errorOverride ?? params.error} />
}
