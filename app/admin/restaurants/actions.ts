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

export type DayConfig = {
    day_of_week: number // 1..7, Mon..Sun
    open: boolean
    opens_at: string | null // "HH:MM" or null
    closes_at: string | null
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export async function saveRestaurantHoursAction(formData: FormData) {
    await requireAdmin()
    const restaurantId = String(formData.get('restaurant_id') ?? '')
    if (!restaurantId) throw new Error('Missing restaurant_id.')

    const days: DayConfig[] = []
    for (let dow = 1; dow <= 7; dow++) {
        const open = formData.get(`day_${dow}_open`) === '1'
        const rawOpens = String(formData.get(`day_${dow}_opens`) ?? '').trim()
        const rawCloses = String(formData.get(`day_${dow}_closes`) ?? '').trim()
        const opens_at = rawOpens || null
        const closes_at = rawCloses || null

        if (open) {
            const hasOpens = opens_at !== null
            const hasCloses = closes_at !== null
            if (hasOpens !== hasCloses) {
                throw new Error(
                    `Day ${dow}: provide both open and close times, or leave both blank.`,
                )
            }
            if (opens_at && !TIME_RE.test(opens_at)) {
                throw new Error(`Day ${dow}: invalid open time "${opens_at}".`)
            }
            if (closes_at && !TIME_RE.test(closes_at)) {
                throw new Error(
                    `Day ${dow}: invalid close time "${closes_at}".`,
                )
            }
        }

        days.push({
            day_of_week: dow,
            open,
            opens_at,
            closes_at,
        })
    }

    if (!days.some((d) => d.open)) {
        throw new Error(
            'At least one day must be open. Use the Active toggle to hide a restaurant entirely.',
        )
    }

    const admin = createAdminClient()
    const closedDays = days.filter((d) => !d.open).map((d) => d.day_of_week)
    const openDays = days.filter((d) => d.open)

    if (closedDays.length > 0) {
        await admin
            .from('restaurant_hours')
            .delete()
            .eq('restaurant_id', restaurantId)
            .in('day_of_week', closedDays)
    }

    if (openDays.length > 0) {
        await admin.from('restaurant_hours').upsert(
            openDays.map((d) => ({
                restaurant_id: restaurantId,
                day_of_week: d.day_of_week,
                opens_at: d.open ? d.opens_at : null,
                closes_at: d.open ? d.closes_at : null,
            })),
            { onConflict: 'restaurant_id,day_of_week' },
        )
    }

    revalidatePath('/admin/restaurants')
    revalidatePath(`/admin/restaurants/${restaurantId}`)
}
