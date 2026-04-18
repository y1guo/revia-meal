import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Reject anything that isn't a same-site path to prevent open-redirect.
function safeNext(raw: string | null): string {
    if (!raw) return '/'
    if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
    return raw
}

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = safeNext(searchParams.get('next'))

    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=unknown`)
    }

    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
        return NextResponse.redirect(`${origin}/login?error=unknown`)
    }

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?error=unknown`)
    }

    const email = user.email.toLowerCase()
    const admin = createAdminClient()

    const { data: row, error: lookupError } = await admin
        .from('users')
        .select('id, is_active, supabase_auth_id')
        .eq('email', email)
        .maybeSingle()

    if (lookupError || !row || !row.is_active) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?error=not_authorized`)
    }

    if (!row.supabase_auth_id) {
        await admin
            .from('users')
            .update({ supabase_auth_id: user.id })
            .eq('id', row.id)
    }

    return NextResponse.redirect(`${origin}${next}`)
}
