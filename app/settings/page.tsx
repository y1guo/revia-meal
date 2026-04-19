import { signOut } from '@/app/actions'
import { AppShell } from '@/components/shell/AppShell'
import { PageHeader } from '@/components/shell/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { FormField } from '@/components/ui/FormField'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TextInput } from '@/components/ui/TextInput'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/cn'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import CreateKeyForm from './create-key-form'
import RevokeButton from './revoke-button'
import { updateDisplayName } from './actions'

type ApiKeyRow = {
    id: string
    name: string
    created_at: string
    last_used_at: string | null
    revoked_at: string | null
}

export default async function SettingsPage() {
    const user = await requireUser()
    const admin = createAdminClient()
    const { data } = await admin
        .from('api_keys')
        .select('id, name, created_at, last_used_at, revoked_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    const keys = (data ?? []) as ApiKeyRow[]
    const activeCount = keys.filter((k) => !k.revoked_at).length

    return (
        <AppShell
            user={user}
            signOutAction={signOut}
            maxWidthClassName="max-w-[720px]"
        >
            <PageHeader title="Settings" />

            <div className="space-y-6">
                <Card className="space-y-4">
                    <div className="flex items-start gap-4">
                        <Avatar
                            name={user.display_name}
                            email={user.email}
                            size={40}
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                            <div className="font-medium text-[color:var(--text-primary)] truncate">
                                {user.display_name ?? user.email}
                            </div>
                            {user.display_name && (
                                <div className="text-[0.8125rem] text-[color:var(--text-secondary)] truncate">
                                    {user.email}
                                </div>
                            )}
                            {user.role === 'admin' && (
                                <div>
                                    <Chip variant="accent">Admin</Chip>
                                </div>
                            )}
                        </div>
                        <form action={signOut}>
                            <Button type="submit" variant="ghost" size="sm">
                                Sign out
                            </Button>
                        </form>
                    </div>
                </Card>

                <Card>
                    <SectionHeader title="Display name" />
                    <form
                        action={updateDisplayName}
                        className="space-y-2 max-w-[420px]"
                    >
                        <FormField
                            id="display-name"
                            label="Your name"
                            help="How your name appears on polls, voter lists, and the People page. Leave blank to fall back to your email."
                        >
                            <div className="flex gap-2">
                                <TextInput
                                    name="display_name"
                                    maxLength={64}
                                    defaultValue={user.display_name ?? ''}
                                    placeholder={user.email}
                                    className="flex-1"
                                />
                                <Button type="submit" variant="primary">
                                    Save
                                </Button>
                            </div>
                        </FormField>
                    </form>
                </Card>

                <Card className="md:hidden">
                    <SectionHeader
                        title="Appearance"
                        subtitle="Follows your system unless you pick manually."
                    />
                    <ThemeToggle size="md" />
                </Card>

                <Card>
                    <SectionHeader
                        title="API keys"
                        subtitle="Use keys to call the revia-meal API as yourself. Treat them like passwords."
                    />
                    <CreateKeyForm />
                </Card>

                <Card>
                    <SectionHeader
                        title={`Your keys (${keys.length})`}
                        subtitle={
                            keys.length === 0
                                ? undefined
                                : `${activeCount} active, ${keys.length - activeCount} revoked`
                        }
                    />
                    {keys.length === 0 ? (
                        <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
                            No API keys yet. Create one above if you need to
                            automate anything.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {keys.map((k) => (
                                <KeyRow key={k.id} row={k} />
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </AppShell>
    )
}

function SectionHeader({
    title,
    subtitle,
}: {
    title: string
    subtitle?: string
}) {
    return (
        <div className="mb-4 space-y-1">
            <h2 className="font-display font-medium text-[1rem] text-[color:var(--text-primary)]">
                {title}
            </h2>
            {subtitle && (
                <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
                    {subtitle}
                </p>
            )}
        </div>
    )
}

function KeyRow({ row }: { row: ApiKeyRow }) {
    const revoked = !!row.revoked_at
    return (
        <li
            className={cn(
                'flex items-start gap-3',
                'rounded-[var(--radius-md)]',
                'bg-[color:var(--surface-sunken)]',
                'px-3 py-3',
                revoked && 'opacity-70',
            )}
        >
            <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[color:var(--text-primary)]">
                        {row.name}
                    </span>
                    {revoked && <StatusBadge status="revoked" />}
                </div>
                <div className="text-[0.75rem] text-[color:var(--text-secondary)]">
                    Created {formatDateTime(row.created_at)}
                    {' · '}
                    {row.last_used_at
                        ? `Last used ${formatDateTime(row.last_used_at)}`
                        : 'Never used'}
                    {revoked && (
                        <>
                            {' · '}
                            Revoked {formatDateTime(row.revoked_at!)}
                        </>
                    )}
                </div>
            </div>
            {!revoked && <RevokeButton keyId={row.id} name={row.name} />}
        </li>
    )
}

function formatDateTime(isoString: string): string {
    return new Date(isoString).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    })
}
