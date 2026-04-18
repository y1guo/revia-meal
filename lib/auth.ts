import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type AppUser = {
    id: string
    email: string
    display_name: string | null
    role: 'user' | 'admin'
    is_active: boolean
    supabase_auth_id: string | null
}

// Cached per request: multiple calls within one render reuse the result.
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const admin = createAdminClient()
    const { data } = await admin
        .from('users')
        .select('id, email, display_name, role, is_active, supabase_auth_id')
        .eq('supabase_auth_id', user.id)
        .maybeSingle()
    return (data as AppUser) ?? null
})

export async function requireUser(): Promise<AppUser> {
    const user = await getCurrentUser()
    if (!user || !user.is_active) redirect('/login')
    return user
}

export async function requireAdmin(): Promise<AppUser> {
    const user = await requireUser()
    if (user.role !== 'admin') redirect('/')
    return user
}
