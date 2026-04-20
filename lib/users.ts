import type { SupabaseClient } from '@supabase/supabase-js'

export type PublicUser = {
    id: string
    display_name: string | null
    email: string
    avatar_url: string | null
}

/**
 * Read a user-display shape (id, display_name, email, avatar_url) with graceful
 * fallback when migration 0002 (avatar_url column) hasn't been applied yet.
 */
export async function selectUsersWithAvatar(
    admin: SupabaseClient,
    ids?: string[],
): Promise<{ data: PublicUser[] }> {
    const base = admin.from('users')
    const withAvatar = ids && ids.length > 0
        ? await base.select('id, display_name, email, avatar_url').in('id', ids)
        : await base.select('id, display_name, email, avatar_url')
    if (withAvatar.error && /column.*avatar_url/i.test(withAvatar.error.message)) {
        const retry = ids && ids.length > 0
            ? await admin.from('users').select('id, display_name, email').in('id', ids)
            : await admin.from('users').select('id, display_name, email')
        return {
            data: (retry.data ?? []).map((u) => ({
                id: u.id as string,
                display_name: u.display_name as string | null,
                email: u.email as string,
                avatar_url: null,
            })),
        }
    }
    return {
        data: (withAvatar.data ?? []).map((u) => {
            const row = u as {
                id: string
                display_name: string | null
                email: string
                avatar_url: string | null
            }
            return {
                id: row.id,
                display_name: row.display_name,
                email: row.email,
                avatar_url: row.avatar_url ?? null,
            }
        }),
    }
}
