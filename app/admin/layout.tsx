import { signOut } from '@/app/actions'
import { AppShell } from '@/components/shell/AppShell'
import { AdminSubNav } from '@/components/shell/AdminSubNav'
import { requireAdmin } from '@/lib/auth'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await requireAdmin()

    return (
        <AppShell
            user={user}
            signOutAction={signOut}
            maxWidthClassName="max-w-[1100px]"
        >
            <AdminSubNav />
            {children}
        </AppShell>
    )
}
