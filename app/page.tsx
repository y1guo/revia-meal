import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getTodaysDashboard, type PollStatus } from '@/lib/polls'
import { signOut } from './actions'

export default async function Home() {
    const user = await getCurrentUser()
    if (!user || !user.is_active) redirect('/login')

    const entries = await getTodaysDashboard()

    return (
        <main className="p-8 space-y-6 max-w-4xl">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">revia-meal</h1>
                    <p className="text-sm text-neutral-500">
                        Signed in as {user.display_name ?? user.email}
                        {user.role === 'admin' ? ' (admin)' : ''}
                    </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <Link href="/people" className="underline">
                        People
                    </Link>
                    <Link href="/history" className="underline">
                        History
                    </Link>
                    <Link href="/settings" className="underline">
                        Settings
                    </Link>
                    {user.role === 'admin' && (
                        <Link href="/admin" className="underline">
                            Admin
                        </Link>
                    )}
                    <form action={signOut}>
                        <button type="submit" className="underline">
                            Sign out
                        </button>
                    </form>
                </div>
            </header>

            <section className="space-y-3">
                <h2 className="text-lg font-medium">Today&apos;s polls</h2>
                {entries.length === 0 ? (
                    <p className="text-sm text-neutral-500">
                        No polls scheduled for today. Check back tomorrow, or ask an admin to activate a
                        template whose schedule includes today.
                    </p>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {entries.map(({ template, poll, status }) => (
                            <Link
                                key={poll.id}
                                href={`/polls/${poll.id}`}
                                className="border rounded-md p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 space-y-2"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="font-medium">{template.name}</h3>
                                    <StatusBadge status={status} />
                                </div>
                                {template.description && (
                                    <p className="text-xs text-neutral-500">
                                        {template.description}
                                    </p>
                                )}
                                <p className="text-xs text-neutral-500">
                                    {subtitle(status, poll)}
                                </p>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </main>
    )
}

function subtitle(
    status: PollStatus,
    poll: { opens_at: string; closes_at: string; cancellation_reason: string | null },
): string {
    switch (status) {
        case 'scheduled':
            return `Opens ${formatTime(poll.opens_at)}`
        case 'open':
            return `Closes ${formatTime(poll.closes_at)}`
        case 'pending_close':
            return 'Voting window ended — finalizing soon'
        case 'closed':
            return 'Closed'
        case 'cancelled':
            return poll.cancellation_reason === 'admin'
                ? 'Cancelled by admin'
                : 'Cancelled (no votes)'
    }
}

function formatTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
    })
}

const STATUS_STYLES: Record<PollStatus, string> = {
    scheduled:
        'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200',
    open: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
    pending_close:
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
    closed:
        'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
    cancelled:
        'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
}

function StatusBadge({ status }: { status: PollStatus }) {
    return (
        <span
            className={`text-xs rounded-full px-2 py-0.5 ${STATUS_STYLES[status]}`}
        >
            {status.replace('_', ' ')}
        </span>
    )
}
