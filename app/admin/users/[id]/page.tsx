import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shell/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { BackLink } from '@/components/ui/BackLink'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { DeleteUserCard } from './delete-user-card'
import { UserEditForm } from './user-edit-form'

type Params = Promise<{ id: string }>

export const metadata: Metadata = { title: 'User · Admin' }

type Row = {
    id: string
    email: string
    display_name: string | null
    role: 'user' | 'admin'
    is_active: boolean
    created_at: string
    avatar_url: string | null
}

export default async function UserDetailPage({
    params,
}: {
    params: Params
}) {
    const currentAdmin = await requireAdmin()
    const { id } = await params
    const supabase = createAdminClient()

    const withAvatar = await supabase
        .from('users')
        .select('id, email, display_name, role, is_active, created_at, avatar_url')
        .eq('id', id)
        .maybeSingle()
    let raw: Record<string, unknown> | null = null
    if (withAvatar.error && /column.*avatar_url/i.test(withAvatar.error.message)) {
        const fallback = await supabase
            .from('users')
            .select('id, email, display_name, role, is_active, created_at')
            .eq('id', id)
            .maybeSingle()
        raw = fallback.data as Record<string, unknown> | null
    } else {
        raw = withAvatar.data as unknown as Record<string, unknown> | null
    }
    if (!raw) notFound()
    const user: Row = {
        id: raw.id as string,
        email: raw.email as string,
        display_name: (raw.display_name as string | null) ?? null,
        role: raw.role as 'user' | 'admin',
        is_active: raw.is_active as boolean,
        created_at: raw.created_at as string,
        avatar_url: (raw.avatar_url as string | null) ?? null,
    }

    const isSelf = user.id === currentAdmin.id
    const addedLabel = new Date(user.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })

    return (
        <>
            <BackLink href="/admin/users">All users</BackLink>
            <PageHeader
                title={user.display_name || user.email}
                subtitle={
                    <span className="flex flex-wrap items-center gap-2">
                        <span>{user.email}</span>
                        <span className="text-[color:var(--text-tertiary)]">·</span>
                        <span>Added {addedLabel}</span>
                        {isSelf && <Chip variant="neutral">you</Chip>}
                    </span>
                }
            />

            <div className="space-y-6">
                <Card className="flex flex-wrap items-center gap-4">
                    <Avatar
                        name={user.display_name}
                        email={user.email}
                        imageUrl={user.avatar_url}
                        size={64}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                        {user.role === 'admin' ? (
                            <Chip variant="accent">Admin</Chip>
                        ) : (
                            <Chip variant="neutral">User</Chip>
                        )}
                        {user.is_active ? (
                            <Chip variant="success">Active</Chip>
                        ) : (
                            <Chip variant="danger">Inactive</Chip>
                        )}
                    </div>
                </Card>

                <UserEditForm user={user} isSelf={isSelf} />

                {!isSelf && (
                    <DeleteUserCard id={user.id} email={user.email} />
                )}
            </div>
        </>
    )
}
