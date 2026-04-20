import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shell/PageHeader'
import { BackLink } from '@/components/ui/BackLink'
import { Chip } from '@/components/ui/Chip'
import { requireAdmin } from '@/lib/auth'
import { formatDate } from '@/lib/format-time'
import { createAdminClient } from '@/lib/supabase/admin'
import { RestaurantEditForm } from './restaurant-edit-form'

type Params = Promise<{ id: string }>

export const metadata: Metadata = { title: 'Restaurant · Admin' }

export default async function RestaurantDetailPage({
    params,
}: {
    params: Params
}) {
    await requireAdmin()
    const { id } = await params
    const supabase = createAdminClient()
    const { data } = await supabase
        .from('restaurants')
        .select('id, name, doordash_url, notes, is_active, created_at')
        .eq('id', id)
        .maybeSingle()
    if (!data) notFound()

    const r = data as {
        id: string
        name: string
        doordash_url: string | null
        notes: string | null
        is_active: boolean
        created_at: string
    }

    const addedLabel = formatDate(r.created_at)

    return (
        <>
            <BackLink href="/admin/restaurants">All restaurants</BackLink>
            <PageHeader
                title={r.name}
                subtitle={
                    <span className="flex flex-wrap items-center gap-2">
                        <span>Added {addedLabel}</span>
                        {r.is_active ? (
                            <Chip variant="success">Active</Chip>
                        ) : (
                            <Chip variant="neutral">Inactive</Chip>
                        )}
                    </span>
                }
            />

            <RestaurantEditForm restaurant={r} />
        </>
    )
}
