'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'

type SaveInput = {
    id: string
    name: string
    description: string | null
    is_active: boolean
    schedule: {
        days_of_week: number[]
        opens_at_local: string
        closes_at_local: string
        timezone: string
    }
    restaurant_ids: string[]
}

/**
 * Single save for the template edit page — updates the template row AND
 * reconciles its restaurant assignments in one call. Replaces the older
 * split updateTemplate / updateAssignments actions.
 */
export async function saveTemplate(input: SaveInput) {
    await requireAdmin()
    const { id, name, description, is_active, schedule, restaurant_ids } = input

    if (!id || !name.trim()) {
        throw new Error('Name is required.')
    }
    const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/
    if (
        !TIME_RE.test(schedule.opens_at_local) ||
        !TIME_RE.test(schedule.closes_at_local)
    ) {
        throw new Error('Opens and closes times must be in HH:MM format.')
    }
    if (
        !Array.isArray(schedule.days_of_week) ||
        schedule.days_of_week.length === 0 ||
        schedule.days_of_week.some((d) => !Number.isInteger(d) || d < 1 || d > 7)
    ) {
        throw new Error('Select at least one valid day of the week.')
    }

    const admin = createAdminClient()

    const { error: tplErr } = await admin
        .from('poll_templates')
        .update({
            name: name.trim(),
            description: description?.trim() || null,
            schedule,
            is_active,
        })
        .eq('id', id)
    if (tplErr) throw new Error(tplErr.message)

    const { data: current, error: readErr } = await admin
        .from('template_restaurants')
        .select('restaurant_id, is_active')
        .eq('template_id', id)
    if (readErr) throw new Error(readErr.message)

    const selected = new Set(restaurant_ids)
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

    for (const rid of selected) {
        if (!currentMap.has(rid)) {
            toInsert.push({
                template_id: id,
                restaurant_id: rid,
                is_active: true,
            })
        } else if (!currentMap.get(rid)) {
            toActivate.push(rid)
        }
    }
    for (const [rid, wasActive] of currentMap) {
        if (wasActive && !selected.has(rid)) toDeactivate.push(rid)
    }

    if (toInsert.length) {
        const { error } = await admin
            .from('template_restaurants')
            .insert(toInsert)
        if (error) throw new Error(error.message)
    }
    if (toActivate.length) {
        const { error } = await admin
            .from('template_restaurants')
            .update({ is_active: true })
            .eq('template_id', id)
            .in('restaurant_id', toActivate)
        if (error) throw new Error(error.message)
    }
    if (toDeactivate.length) {
        const { error } = await admin
            .from('template_restaurants')
            .update({ is_active: false })
            .eq('template_id', id)
            .in('restaurant_id', toDeactivate)
        if (error) throw new Error(error.message)
    }

    revalidatePath(`/admin/templates/${id}`)
    revalidatePath('/admin/templates')
}
