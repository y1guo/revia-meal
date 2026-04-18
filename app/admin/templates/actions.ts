'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'

export async function createTemplate(formData: FormData) {
    await requireAdmin()
    const name = String(formData.get('name') ?? '').trim()
    if (!name) return

    const admin = createAdminClient()
    const { data, error } = await admin
        .from('poll_templates')
        .insert({
            name,
            schedule: {
                days_of_week: [1, 2, 3, 4, 5],
                opens_at_local: '10:00',
                closes_at_local: '11:30',
                timezone: 'America/Los_Angeles',
            },
            is_active: false,
        })
        .select('id')
        .single()

    revalidatePath('/admin/templates')
    if (data && !error) redirect(`/admin/templates/${data.id}`)
}
