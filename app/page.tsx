import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function Home() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const admin = createAdminClient()
    const { data: appUser } = await admin
        .from('users')
        .select('display_name, email, role')
        .eq('supabase_auth_id', user.id)
        .maybeSingle()

    const name = appUser?.display_name ?? appUser?.email ?? user.email
    const isAdmin = appUser?.role === 'admin'

    return (
        <main className="p-8 space-y-4">
            <header>
                <h1 className="text-2xl font-semibold">revia-meal</h1>
                <p className="text-sm text-neutral-500">HeyRevia lunch polls</p>
            </header>
            <p>
                Signed in as <strong>{name}</strong>
                {isAdmin ? ' (admin)' : ''}
            </p>
            <p className="text-sm text-neutral-500">
                Polls, leaderboard, and admin pages aren&apos;t implemented yet.
            </p>
        </main>
    )
}
