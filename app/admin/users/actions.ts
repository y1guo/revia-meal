'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'

export async function addUser(formData: FormData) {
    await requireAdmin()
    const email = String(formData.get('email') ?? '')
        .toLowerCase()
        .trim()
    const role = String(formData.get('role') ?? 'user') === 'admin' ? 'admin' : 'user'

    if (!email) return

    const admin = createAdminClient()
    await admin.from('users').insert({
        email,
        role,
        is_active: true,
        display_name: email,
    })
    revalidatePath('/admin/users')
}

export async function updateUser(formData: FormData) {
    const currentAdmin = await requireAdmin()
    const id = String(formData.get('id') ?? '')
    const display_name = String(formData.get('display_name') ?? '').trim() || null

    if (!id) return

    const admin = createAdminClient()

    if (id === currentAdmin.id) {
        // Self-edit: only allow display_name change. Role and is_active stay locked.
        await admin.from('users').update({ display_name }).eq('id', id)
    } else {
        const role =
            String(formData.get('role') ?? 'user') === 'admin' ? 'admin' : 'user'
        const is_active = formData.get('is_active') === 'on'
        await admin.from('users').update({ display_name, role, is_active }).eq('id', id)
    }

    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${id}`)
}

export async function deleteUser(formData: FormData) {
    const currentAdmin = await requireAdmin()
    const id = String(formData.get('id') ?? '')
    if (!id) return
    // Never let an admin delete themselves — locks them out of further
    // admin operations and, with only one admin in the system, locks
    // everyone out. Enforced in the UI too, but also here so the action
    // can't be triggered via a crafted request.
    if (id === currentAdmin.id) return

    const admin = createAdminClient()
    // Hard delete. Schema cascades: votes, daily_participation, api_keys
    // are removed; polls.cancelled_by is set to NULL so poll history is
    // preserved without orphaned attribution.
    await admin.from('users').delete().eq('id', id)
    revalidatePath('/admin/users')
}

export async function bulkSetActive(ids: string[], active: boolean) {
    const currentAdmin = await requireAdmin()
    const safeIds = ids.filter((id) => id !== currentAdmin.id)
    if (safeIds.length === 0) return { updated: 0 }
    const admin = createAdminClient()
    await admin
        .from('users')
        .update({ is_active: active })
        .in('id', safeIds)
    revalidatePath('/admin/users')
    return { updated: safeIds.length }
}

export async function bulkDelete(ids: string[]) {
    const currentAdmin = await requireAdmin()
    const safeIds = ids.filter((id) => id !== currentAdmin.id)
    if (safeIds.length === 0) return { deleted: 0 }
    const admin = createAdminClient()
    await admin.from('users').delete().in('id', safeIds)
    revalidatePath('/admin/users')
    return { deleted: safeIds.length }
}
