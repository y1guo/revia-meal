import type { Metadata } from 'next'
import { PageHeader } from '@/components/shell/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { TableCount } from '@/components/ui/TableToolbar'
import { createAdminClient } from '@/lib/supabase/admin'
import { AddRestaurantModal } from './add-restaurant-modal'
import { BookmarkletInstall } from './bookmarklet-install'
import {
    RestaurantsTable,
    type RestaurantRow,
} from './restaurants-table'
import { StatusFilter } from './status-filter'

export const metadata: Metadata = { title: 'Restaurants · Admin' }

const PAGE_SIZE = 20

type SearchParams = Promise<{
    q?: string
    status?: string
    page?: string
}>

export default async function RestaurantsPage({
    searchParams,
}: {
    searchParams: SearchParams
}) {
    const params = await searchParams
    const q = (params.q ?? '').trim()
    const status =
        params.status === 'active' || params.status === 'inactive'
            ? params.status
            : ''
    const page = Math.max(1, Number(params.page) || 1)

    const supabase = createAdminClient()
    let query = supabase
        .from('restaurants')
        .select('id, name, doordash_url, notes, is_active, created_at', {
            count: 'exact',
        })
    if (q) query = query.ilike('name', `%${q}%`)
    if (status === 'active') query = query.eq('is_active', true)
    if (status === 'inactive') query = query.eq('is_active', false)

    const { data, count } = await query
        .order('name', { ascending: true })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    const rows: RestaurantRow[] = (data ?? []).map((r) => ({
        id: r.id as string,
        name: r.name as string,
        doordash_url: (r.doordash_url as string | null) ?? null,
        notes: (r.notes as string | null) ?? null,
        is_active: r.is_active as boolean,
        created_at: r.created_at as string,
    }))
    const total = count ?? rows.length

    return (
        <>
            <PageHeader
                title="Restaurants"
                subtitle="Shared catalog. Add once, then assign to templates separately."
            />

            <div className="space-y-4">
                <BookmarkletInstall />
                <RestaurantsTable
                    rows={rows}
                    leading={
                        <>
                            <div className="min-w-[200px] flex-1 md:max-w-[360px]">
                                <SearchInput
                                    placeholder="Search by name…"
                                    resetParams={['page']}
                                />
                            </div>
                            <StatusFilter value={status} />
                        </>
                    }
                    trailing={
                        <>
                            <TableCount
                                showing={rows.length}
                                total={total}
                                noun="restaurant"
                            />
                            <AddRestaurantModal />
                        </>
                    }
                />

                <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
            </div>
        </>
    )
}
