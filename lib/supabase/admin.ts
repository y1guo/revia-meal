import { createClient } from '@supabase/supabase-js'

// Privileged server-side client. Bypasses RLS.
// Use only in route handlers / server actions / scripts — never ship to the browser.
export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        },
    )
}
