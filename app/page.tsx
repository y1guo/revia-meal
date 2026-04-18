import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { signOut } from './actions'

export default async function Home() {
    const user = await getCurrentUser()
    if (!user || !user.is_active) redirect('/login')

    return (
        <main className="p-8 space-y-4 max-w-4xl">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">revia-meal</h1>
                    <p className="text-sm text-neutral-500">HeyRevia lunch polls</p>
                </div>
                <form action={signOut}>
                    <button className="text-sm underline" type="submit">
                        Sign out
                    </button>
                </form>
            </header>
            <p>
                Signed in as <strong>{user.display_name ?? user.email}</strong>
                {user.role === 'admin' ? ' (admin)' : ''}
            </p>
            {user.role === 'admin' && (
                <p>
                    <Link href="/admin" className="text-blue-600 underline">
                        Admin →
                    </Link>
                </p>
            )}
            <p className="text-sm text-neutral-500">
                Polls, leaderboard, and settings aren&apos;t implemented yet.
            </p>
        </main>
    )
}
