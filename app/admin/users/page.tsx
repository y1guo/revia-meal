import type { Metadata } from 'next'
import { PageHeader } from '@/components/shell/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { TableCount } from '@/components/ui/TableToolbar'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AddUserModal } from './add-user-modal'
import { RoleFilter } from './role-filter'
import { UsersTable, type UserRow } from './users-table'

export const metadata: Metadata = { title: 'Users · Admin' }

const PAGE_SIZE = 20

type SearchParams = Promise<{
    q?: string
    role?: string
    page?: string
}>

export default async function UsersPage({
    searchParams,
}: {
    searchParams: SearchParams
}) {
    const currentAdmin = await requireAdmin()
    const params = await searchParams
    const q = (params.q ?? '').trim()
    const roleFilter = params.role === 'admin' || params.role === 'user' ? params.role : ''
    const page = Math.max(1, Number(params.page) || 1)

    const supabase = createAdminClient()
    const tryQuery = async (includeAvatar: boolean) => {
        const base = includeAvatar
            ? supabase
                  .from('users')
                  .select(
                      'id, email, display_name, role, is_active, created_at, avatar_url',
                      { count: 'exact' },
                  )
            : supabase
                  .from('users')
                  .select('id, email, display_name, role, is_active, created_at', {
                      count: 'exact',
                  })
        let query = base
        if (q) {
            query = query.or(
                `email.ilike.%${q}%,display_name.ilike.%${q}%`,
            )
        }
        if (roleFilter) query = query.eq('role', roleFilter)
        return await query
            .order('created_at', { ascending: false })
            .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    }

    let res = await tryQuery(true)
    if (res.error && /column.*avatar_url/i.test(res.error.message)) {
        res = await tryQuery(false)
    }

    const rows: UserRow[] = (res.data ?? []).map((u) => ({
        id: u.id as string,
        email: u.email as string,
        display_name: u.display_name as string | null,
        role: u.role as 'user' | 'admin',
        is_active: u.is_active as boolean,
        created_at: u.created_at as string,
        avatar_url:
            ('avatar_url' in u ? (u.avatar_url as string | null) : null) ??
            null,
    }))
    const total = res.count ?? rows.length

    return (
        <>
            <PageHeader
                title="Users"
                subtitle="Allowlist for sign-in. Only active users can log in with Google."
            />

            <div className="space-y-4">
                <UsersTable
                    rows={rows}
                    currentAdminId={currentAdmin.id}
                    leading={
                        <>
                            <div className="min-w-[200px] flex-1 md:max-w-[360px]">
                                <SearchInput
                                    placeholder="Search by email or name…"
                                    resetParams={['page']}
                                />
                            </div>
                            <RoleFilter value={roleFilter} />
                        </>
                    }
                    trailing={
                        <>
                            <TableCount
                                showing={rows.length}
                                total={total}
                                noun="user"
                            />
                            <AddUserModal />
                        </>
                    }
                />

                <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
            </div>
        </>
    )
}

