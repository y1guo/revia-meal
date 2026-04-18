'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'

export async function updateTemplate(formData: FormData) {
    await requireAdmin()
    const id = String(formData.get('id') ?? '')
    const name = String(formData.get('name') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim() || null
    const is_active = formData.get('is_active') === 'on'

    const days = formData
        .getAll('days_of_week')
        .map((d) => Number(d))
        .filter((n) => n >= 1 && n <= 7)
        .sort((a, b) => a - b)
    const opens_at_local = String(formData.get('opens_at_local') ?? '10:00')
    const closes_at_local = String(formData.get('closes_at_local') ?? '11:30')
    const timezone =
        String(formData.get('timezone') ?? 'America/Los_Angeles').trim() ||
        'America/Los_Angeles'

    if (!id || !name) return

    const admin = createAdminClient()
    await admin
        .from('poll_templates')
        .update({
            name,
            description,
            schedule: {
                days_of_week: days,
                opens_at_local,
                closes_at_local,
                timezone,
            },
            is_active,
        })
        .eq('id', id)

    revalidatePath(`/admin/templates/${id}`)
    revalidatePath('/admin/templates')
}

export async function updateAssignments(formData: FormData) {
    await requireAdmin()
    const templateId = String(formData.get('id') ?? '')
    const selectedIds = new Set(formData.getAll('restaurant_ids').map(String))

    if (!templateId) return

    const admin = createAdminClient()

    const { data: current } = await admin
        .from('template_restaurants')
        .select('restaurant_id, is_active')
        .eq('template_id', templateId)

    const currentMap = new Map<string, boolean>(
        (current ?? []).map((a) => [a.restaurant_id, a.is_active]),
    )

    const toInsert: Array<{
        template_id: string
        restaurant_id: string
        is_active: boolean
    }> = []
    const toActivate: string[] = []
    const toDeactivate: string[] = []

    for (const rid of selectedIds) {
        if (!currentMap.has(rid)) {
            toInsert.push({ template_id: templateId, restaurant_id: rid, is_active: true })
        } else if (!currentMap.get(rid)) {
            toActivate.push(rid)
        }
    }
    for (const [rid, isActive] of currentMap) {
        if (isActive && !selectedIds.has(rid)) {
            toDeactivate.push(rid)
        }
    }

    if (toInsert.length) {
        await admin.from('template_restaurants').insert(toInsert)
    }
    if (toActivate.length) {
        await admin
            .from('template_restaurants')
            .update({ is_active: true })
            .eq('template_id', templateId)
            .in('restaurant_id', toActivate)
    }
    if (toDeactivate.length) {
        await admin
            .from('template_restaurants')
            .update({ is_active: false })
            .eq('template_id', templateId)
            .in('restaurant_id', toDeactivate)
    }

    revalidatePath(`/admin/templates/${templateId}`)
}
