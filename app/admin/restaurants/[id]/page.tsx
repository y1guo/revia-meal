import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shell/PageHeader'
import { BackLink } from '@/components/ui/BackLink'
import { Chip } from '@/components/ui/Chip'
import { requireAdmin } from '@/lib/auth'
import { formatDate } from '@/lib/format-time'
import { createAdminClient } from '@/lib/supabase/admin'
import type { RichContent } from '@/lib/rich-content'
import { HoursEditor, type DayHours } from './hours-editor'
import { RestaurantEditForm } from './restaurant-edit-form'
import { RichContentCard } from './rich-content-card'

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
    const [{ data }, { data: hoursData }] = await Promise.all([
        supabase
            .from('restaurants')
            .select(
                'id, name, doordash_url, notes, is_active, created_at, rich_content',
            )
            .eq('id', id)
            .maybeSingle(),
        supabase
            .from('restaurant_hours')
            .select('day_of_week, opens_at, closes_at')
            .eq('restaurant_id', id),
    ])
    if (!data) notFound()

    const r = data as {
        id: string
        name: string
        doordash_url: string | null
        notes: string | null
        is_active: boolean
        created_at: string
        rich_content: RichContent | null
    }

    // Postgres `time` values serialize as "HH:MM:SS"; the <input type="time">
    // expects "HH:MM". Normalize here so the editor's state round-trips.
    const trimSeconds = (t: string | null): string | null =>
        t ? t.slice(0, 5) : null
    const byDay = new Map<number, { opens_at: string | null; closes_at: string | null }>(
        (hoursData ?? []).map((h) => [
            h.day_of_week as number,
            {
                opens_at: trimSeconds(h.opens_at as string | null),
                closes_at: trimSeconds(h.closes_at as string | null),
            },
        ]),
    )
    const hasAnyRow = (hoursData ?? []).length > 0
    const initialHours: DayHours[] = []
    for (let dow = 1; dow <= 7; dow++) {
        const row = byDay.get(dow)
        initialHours.push({
            day_of_week: dow,
            // When no rows exist at all, default every day to open ("unconfigured").
            // Otherwise honor what's in the DB: row present = open, absent = closed.
            open: hasAnyRow ? row !== undefined : true,
            opens_at: row?.opens_at ?? null,
            closes_at: row?.closes_at ?? null,
        })
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

            <div className="mt-6">
                <HoursEditor
                    restaurantId={r.id}
                    initialHours={initialHours}
                    unconfigured={!hasAnyRow}
                />
            </div>

            {r.rich_content && (
                <div className="mt-6">
                    <RichContentCard
                        restaurantId={r.id}
                        restaurantName={r.name}
                        richContent={r.rich_content}
                    />
                </div>
            )}
        </>
    )
}
