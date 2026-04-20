'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'

export async function addRestaurant(formData: FormData) {
    await requireAdmin()
    const name = String(formData.get('name') ?? '').trim()
    const doordash_url = String(formData.get('doordash_url') ?? '').trim() || null
    const notes = String(formData.get('notes') ?? '').trim() || null

    if (!name) return

    const admin = createAdminClient()
    await admin.from('restaurants').insert({
        name,
        doordash_url,
        notes,
        is_active: true,
    })
    revalidatePath('/admin/restaurants')
}

export async function updateRestaurant(formData: FormData) {
    await requireAdmin()
    const id = String(formData.get('id') ?? '')
    const name = String(formData.get('name') ?? '').trim()
    const doordash_url = String(formData.get('doordash_url') ?? '').trim() || null
    const notes = String(formData.get('notes') ?? '').trim() || null
    const is_active = formData.get('is_active') === 'on'

    if (!id || !name) return

    const admin = createAdminClient()
    await admin
        .from('restaurants')
        .update({ name, doordash_url, notes, is_active })
        .eq('id', id)
    revalidatePath('/admin/restaurants')
    revalidatePath(`/admin/restaurants/${id}`)
}

export async function bulkSetActiveRestaurants(ids: string[], active: boolean) {
    await requireAdmin()
    if (ids.length === 0) return { updated: 0 }
    const admin = createAdminClient()
    await admin
        .from('restaurants')
        .update({ is_active: active })
        .in('id', ids)
    revalidatePath('/admin/restaurants')
    return { updated: ids.length }
}
