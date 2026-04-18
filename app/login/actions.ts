'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function devBypassEnabled(): boolean {
    return (
        process.env.NODE_ENV !== 'production' &&
        process.env.DEV_AUTH_BYPASS === 'true'
    )
}

function safeNext(raw: string): string {
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/'
    return raw
}

export async function devSignIn(formData: FormData): Promise<void> {
    if (!devBypassEnabled()) {
        throw new Error('Dev sign-in is not enabled')
    }

    const email = String(formData.get('email') ?? '').toLowerCase().trim()
    const next = safeNext(String(formData.get('next') ?? '/'))
    if (!email) return

    const admin = createAdminClient()

    // Must be on the allowlist and active — same check as /auth/callback.
    const { data: row } = await admin
        .from('users')
        .select('id, is_active, supabase_auth_id')
        .eq('email', email)
        .maybeSingle()
    if (!row || !row.is_active) {
        throw new Error(`Email ${email} is not on the allowlist or is inactive`)
    }

    // Ensure an auth.users row exists in Supabase. createUser errors if it
    // already exists — we treat that as success.
    if (!row.supabase_auth_id) {
        const { error: createErr } = await admin.auth.admin.createUser({
            email,
            email_confirm: true,
        })
        if (createErr && !createErr.message.toLowerCase().includes('already')) {
            throw new Error(`createUser failed: ${createErr.message}`)
        }
    }

    // Generate a one-shot magic-link token and immediately verify it to mint a session.
    const { data: linkData, error: linkErr } =
        await admin.auth.admin.generateLink({
            type: 'magiclink',
            email,
        })
    if (linkErr || !linkData?.properties?.hashed_token) {
        throw new Error(`generateLink failed: ${linkErr?.message ?? 'no token'}`)
    }

    const supabase = await createClient()
    const { data: session, error: verifyErr } = await supabase.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: 'email',
    })
    if (verifyErr || !session?.user) {
        throw new Error(`verifyOtp failed: ${verifyErr?.message ?? 'no user'}`)
    }

    // Bind supabase_auth_id on first sign-in (same as /auth/callback).
    if (!row.supabase_auth_id) {
        await admin
            .from('users')
            .update({ supabase_auth_id: session.user.id })
            .eq('id', row.id)
    }

    redirect(next)
}
