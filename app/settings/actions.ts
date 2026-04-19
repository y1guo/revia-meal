'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateApiKey } from '@/lib/api-keys'

export type CreateKeyResult =
    | { ok: true; name: string; plaintext: string }
    | { ok: false; error: string }

export async function createApiKey(
    _prev: CreateKeyResult | null,
    formData: FormData,
): Promise<CreateKeyResult> {
    const user = await requireUser()
    const name = String(formData.get('name') ?? '').trim()
    if (!name) return { ok: false, error: 'Name is required.' }
    if (name.length > 64) {
        return { ok: false, error: 'Name must be 64 characters or fewer.' }
    }

    const { plaintext, hash } = generateApiKey()
    const admin = createAdminClient()
    const { error } = await admin
        .from('api_keys')
        .insert({ user_id: user.id, name, token_hash: hash })
    if (error) return { ok: false, error: error.message }

    revalidatePath('/settings')
    return { ok: true, name, plaintext }
}

export async function revokeApiKey(formData: FormData) {
    const user = await requireUser()
    const keyId = String(formData.get('key_id') ?? '')
    if (!keyId) return

    const admin = createAdminClient()
    // Scope by user_id so a user can only revoke their own keys, even if
    // the id leaks or is guessed.
    await admin
        .from('api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', keyId)
        .eq('user_id', user.id)
        .is('revoked_at', null)

    revalidatePath('/settings')
}
