import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shell/PageHeader'
import { BackLink } from '@/components/ui/BackLink'
import { createAdminClient } from '@/lib/supabase/admin'
import { TemplateEditForm } from './template-edit-form'

type Params = Promise<{ id: string }>

type Schedule = {
    days_of_week?: number[]
    opens_at_local?: string
    closes_at_local?: string
    timezone?: string
}

export async function generateMetadata({
    params,
}: {
    params: Params
}): Promise<Metadata> {
    const { id } = await params
    const admin = createAdminClient()
    const { data } = await admin
        .from('poll_templates')
        .select('name')
        .eq('id', id)
        .maybeSingle()
    const name = data?.name ?? 'Template'
    return { title: `${name} · Templates · Admin` }
}

export default async function TemplateEditPage({
    params,
}: {
    params: Params
}) {
    const { id } = await params
    const admin = createAdminClient()

    const [templateRes, restaurantsRes, assignmentsRes] = await Promise.all([
        admin
            .from('poll_templates')
            .select('id, name, description, schedule, is_active')
            .eq('id', id)
            .maybeSingle(),
        admin.from('restaurants').select('id, name, is_active').order('name'),
        admin
            .from('template_restaurants')
            .select('restaurant_id, is_active')
            .eq('template_id', id),
    ])

    const template = templateRes.data
    if (!template) notFound()

    const schedule = (template.schedule ?? {}) as Schedule

    return (
        <>
            <BackLink href="/admin/templates">All templates</BackLink>
            <PageHeader
                title={template.name}
                subtitle="Template settings and restaurant assignments."
            />

            <TemplateEditForm
                template={{
                    id: template.id,
                    name: template.name,
                    description: template.description,
                    is_active: template.is_active,
                    schedule: {
                        days_of_week: schedule.days_of_week ?? [],
                        opens_at_local: schedule.opens_at_local ?? '10:00',
                        closes_at_local: schedule.closes_at_local ?? '11:30',
                        timezone: schedule.timezone ?? 'America/Los_Angeles',
                    },
                }}
                restaurants={restaurantsRes.data ?? []}
                assignments={assignmentsRes.data ?? []}
            />
        </>
    )
}
