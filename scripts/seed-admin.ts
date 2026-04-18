import { createClient } from '@supabase/supabase-js'

async function main() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SECRET_KEY
    const email = process.env.INITIAL_ADMIN_EMAIL?.toLowerCase().trim()

    if (!url || !key) {
        console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local.')
        process.exit(1)
    }
    if (!email) {
        console.error('Missing INITIAL_ADMIN_EMAIL in .env.local.')
        process.exit(1)
    }

    const supabase = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    })

    const { count, error: countError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })

    if (countError) {
        console.error('Failed to read users table:', countError.message)
        process.exit(1)
    }

    if ((count ?? 0) > 0) {
        console.log(`users table already has ${count} row(s); skipping seed.`)
        return
    }

    const { error } = await supabase.from('users').insert({
        email,
        role: 'admin',
        is_active: true,
        display_name: email,
    })

    if (error) {
        console.error('Failed to insert admin row:', error.message)
        process.exit(1)
    }

    console.log(`Seeded initial admin: ${email}`)
}

main()
