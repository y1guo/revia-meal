import { redirect } from 'next/navigation'
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

    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (user) {
        redirect(next)
    }

    return <LoginForm next={next} error={params.error} />
}
