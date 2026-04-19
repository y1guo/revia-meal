import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { signOut } from '../actions'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await requireAdmin()

    return (
        <div className="min-h-screen flex flex-col">
            <nav className="border-b border-neutral-200 dark:border-neutral-800 px-8 py-4 flex items-center gap-6 text-sm">
                <Link href="/" className="font-semibold">
                    revia-meal
                </Link>
                <Link href="/admin">Admin</Link>
                <Link href="/admin/users">Users</Link>
                <Link href="/admin/restaurants">Restaurants</Link>
                <Link href="/admin/templates">Templates</Link>
                <Link href="/admin/polls">Polls</Link>
                <span className="ml-auto text-neutral-500">
                    {user.display_name ?? user.email}
                </span>
                <form action={signOut}>
                    <button type="submit" className="text-sm underline">
                        Sign out
                    </button>
                </form>
            </nav>
            <div className="flex-1">{children}</div>
        </div>
    )
}
