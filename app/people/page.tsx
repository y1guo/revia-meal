import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

type SearchParams = Promise<{ from?: string; to?: string }>

function defaultRange(): { from: string; to: string } {
    const today = new Date()
    const from = new Date(today)
    from.setDate(today.getDate() - 30)
    return {
        from: toISODate(from),
        to: toISODate(today),
    }
}

function toISODate(d: Date): string {
    // en-CA's short date is YYYY-MM-DD in the server's local tz.
    return d.toLocaleDateString('en-CA')
}

export default async function PeoplePage({
    searchParams,
}: {
    searchParams: SearchParams
}) {
    await requireUser()
    const params = await searchParams
    const { from: defaultFrom, to: defaultTo } = defaultRange()
    const from = params.from || defaultFrom
    const to = params.to || defaultTo

    const admin = createAdminClient()
    const [votesRes, usersRes, restaurantsRes] = await Promise.all([
        admin
            .from('votes')
            .select('user_id, restaurant_id, vote_weight, scheduled_date')
            .gte('scheduled_date', from)
            .lte('scheduled_date', to),
        admin.from('users').select('id, display_name, email'),
        admin.from('restaurants').select('id, name'),
    ])

    const userMap = new Map(
        (usersRes.data ?? []).map((u) => [
            u.id as string,
            {
                display_name: u.display_name as string | null,
                email: u.email as string,
            },
        ]),
    )
    const restaurantMap = new Map(
        (restaurantsRes.data ?? []).map((r) => [
            r.id as string,
            r.name as string,
        ]),
    )

    // Aggregate per (user, restaurant); track unique poll dates for totals.
    type Agg = { vote_weight_sum: number; poll_count: number }
    const userRestaurantAgg = new Map<string, Map<string, Agg>>()
    const datesByUser = new Map<string, Set<string>>()

    for (const v of votesRes.data ?? []) {
        const uid = v.user_id as string
        const rid = v.restaurant_id as string
        const weight = Number(v.vote_weight)
        const date = v.scheduled_date as string

        if (!userRestaurantAgg.has(uid)) userRestaurantAgg.set(uid, new Map())
        const inner = userRestaurantAgg.get(uid)!
        if (!inner.has(rid))
            inner.set(rid, { vote_weight_sum: 0, poll_count: 0 })
        const agg = inner.get(rid)!
        agg.vote_weight_sum += weight
        agg.poll_count += 1

        if (!datesByUser.has(uid)) datesByUser.set(uid, new Set())
        datesByUser.get(uid)!.add(date)
    }

    const userRows = Array.from(userRestaurantAgg.entries())
        .map(([uid, agg]) => {
            const user = userMap.get(uid)
            if (!user) return null
            const breakdown = Array.from(agg.entries())
                .map(([rid, a]) => ({
                    restaurantId: rid,
                    restaurantName: restaurantMap.get(rid) ?? '(removed)',
                    ...a,
                }))
                .sort((a, b) => b.vote_weight_sum - a.vote_weight_sum)
            const totalWeight = breakdown.reduce(
                (s, b) => s + b.vote_weight_sum,
                0,
            )
            return {
                userId: uid,
                displayName: user.display_name || user.email,
                email: user.email,
                breakdown,
                totalWeight,
                totalPolls: datesByUser.get(uid)?.size ?? 0,
            }
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => b.totalPolls - a.totalPolls)

    return (
        <main className="p-8 space-y-6 max-w-3xl">
            <p className="text-sm">
                <Link href="/" className="underline">
                    ← Today&apos;s polls
                </Link>
            </p>
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold">People</h1>
                <p className="text-sm text-neutral-500">
                    Each person&apos;s favorite restaurants over the selected
                    range, based on their vote weights. Cancelled polls are
                    included — they still represent what someone wanted that
                    day.
                </p>
            </header>

            <form className="flex items-end gap-3">
                <label className="grid gap-1">
                    <span className="text-xs text-neutral-500">From</span>
                    <input
                        type="date"
                        name="from"
                        defaultValue={from}
                        className="border rounded-md px-2 py-1 bg-transparent"
                    />
                </label>
                <label className="grid gap-1">
                    <span className="text-xs text-neutral-500">To</span>
                    <input
                        type="date"
                        name="to"
                        defaultValue={to}
                        className="border rounded-md px-2 py-1 bg-transparent"
                    />
                </label>
                <button
                    type="submit"
                    className="border rounded-md px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
                >
                    Apply
                </button>
            </form>

            {userRows.length === 0 ? (
                <p className="text-sm text-neutral-500">
                    No votes in this range.
                </p>
            ) : (
                <ul className="space-y-4">
                    {userRows.map((row) => {
                        const topWeight = row.breakdown[0]?.vote_weight_sum ?? 0
                        return (
                            <li
                                key={row.userId}
                                className="border rounded-md p-4 space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">
                                        {row.displayName}
                                    </span>
                                    <span className="text-xs text-neutral-500 tabular-nums">
                                        {row.totalPolls}{' '}
                                        {row.totalPolls === 1 ? 'poll' : 'polls'}{' '}
                                        · {formatNum(row.totalWeight)}{' '}
                                        {row.totalWeight === 1
                                            ? 'credit'
                                            : 'credits'}
                                    </span>
                                </div>
                                <ul className="space-y-1">
                                    {row.breakdown.map((b) => {
                                        const pct =
                                            topWeight > 0
                                                ? (b.vote_weight_sum /
                                                      topWeight) *
                                                  100
                                                : 0
                                        return (
                                            <li
                                                key={b.restaurantId}
                                                className="flex items-center gap-3 text-sm"
                                            >
                                                <span className="w-40 truncate">
                                                    {b.restaurantName}
                                                </span>
                                                <span className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                                    <span
                                                        className="block h-full bg-neutral-400 dark:bg-neutral-500"
                                                        style={{
                                                            width: `${pct}%`,
                                                        }}
                                                    />
                                                </span>
                                                <span className="tabular-nums text-xs text-neutral-500 w-28 text-right">
                                                    {formatNum(
                                                        b.vote_weight_sum,
                                                    )}{' '}
                                                    ({b.poll_count})
                                                </span>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </li>
                        )
                    })}
                </ul>
            )}
        </main>
    )
}

function formatNum(n: number): string {
    return n.toFixed(2).replace(/\.?0+$/, '')
}
