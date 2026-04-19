import { createAdminClient } from '@/lib/supabase/admin'
import { hashApiKey, looksLikeApiKey } from '@/lib/api-keys'
import type { AppUser } from '@/lib/auth'

export type ApiAuthResult =
    | { ok: true; user: AppUser }
    | { ok: false; status: number; error: string }

/**
 * Authenticate an incoming API request by its `Authorization: Bearer <token>`
 * header. On success returns the associated user; on failure returns a
 * JSON-ready error with a matching HTTP status.
 *
 * Permission checks are NOT performed here — callers should inspect
 * `user.role` (and whatever else) to gate access. This is intentional:
 * API access mirrors the user's web-UI access, so feature-level authz lives
 * next to the feature, not in the auth layer.
 *
 * Side effect: bumps `last_used_at` on the matched key so the Settings page
 * can show staleness.
 */
export async function authenticateApiRequest(
    request: Request,
): Promise<ApiAuthResult> {
    const header = request.headers.get('authorization')
    if (!header) {
        return {
            ok: false,
            status: 401,
            error: 'Missing Authorization header.',
        }
    }

    const match = /^Bearer\s+(.+)$/i.exec(header.trim())
    if (!match) {
        return {
            ok: false,
            status: 401,
            error: 'Authorization header must be "Bearer <token>".',
        }
    }

    const plaintext = match[1].trim()
    if (!looksLikeApiKey(plaintext)) {
        return { ok: false, status: 401, error: 'Invalid API key.' }
    }

    const admin = createAdminClient()
    const hash = hashApiKey(plaintext)
    const { data: keyRow } = await admin
        .from('api_keys')
        .select('id, user_id, revoked_at')
        .eq('token_hash', hash)
        .maybeSingle()

    if (!keyRow || keyRow.revoked_at) {
        return { ok: false, status: 401, error: 'Invalid API key.' }
    }

    const { data: userRow } = await admin
        .from('users')
        .select('id, email, display_name, role, is_active, supabase_auth_id')
        .eq('id', keyRow.user_id)
        .maybeSingle()

    if (!userRow || !userRow.is_active) {
        return { ok: false, status: 403, error: 'User account is not active.' }
    }

    // Bump last_used_at; await because the admin client is fast and local.
    // Don't fail the request if this update errors — the auth has succeeded.
    await admin
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyRow.id)

    return { ok: true, user: userRow as AppUser }
}
