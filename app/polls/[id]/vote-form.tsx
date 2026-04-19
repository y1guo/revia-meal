'use client'

import { useActionState, useMemo, useState } from 'react'
import { submitVote, type SubmitVoteResult } from './actions'

export type Ballot = {
    id: string
    name: string
    notes: string | null
}

export default function VoteForm({
    pollId,
    ballot,
    initialPicks,
    bankedByRestaurant,
}: {
    pollId: string
    ballot: Ballot[]
    initialPicks: string[]
    bankedByRestaurant: Record<string, number>
}) {
    const initialKey = useMemo(
        () => initialPicks.slice().sort().join('|'),
        [initialPicks],
    )
    const [picks, setPicks] = useState<Set<string>>(new Set(initialPicks))
    // React 19's <form action> auto-resets uncontrolled inputs to their
    // defaultChecked. When the server pushes a new initialPicks (after a
    // successful submit), bump syncedKey to (a) reset our picks state to
    // match and (b) re-mount the checkboxes so defaultChecked picks up the
    // new server view.
    const [syncedKey, setSyncedKey] = useState(initialKey)
    if (syncedKey !== initialKey) {
        setSyncedKey(initialKey)
        setPicks(new Set(initialPicks))
    }
    const [state, action, pending] = useActionState<
        SubmitVoteResult | null,
        FormData
    >(submitVote, null)

    const weightLabel = useMemo(() => {
        if (picks.size === 0) return null
        return picks.size === 1 ? '1 credit' : `1/${picks.size} credit`
    }, [picks])

    return (
        <form action={action} className="space-y-3">
            <input type="hidden" name="poll_id" value={pollId} />

            <ul className="border rounded-md divide-y">
                {ballot.map((r) => (
                    <li key={r.id}>
                        <label className="flex items-start gap-3 p-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900">
                            <input
                                key={`${r.id}-${initialKey}`}
                                type="checkbox"
                                name="picks"
                                value={r.id}
                                defaultChecked={initialPicks.includes(r.id)}
                                className="mt-1"
                                onChange={(e) => {
                                    setPicks((prev) => {
                                        const next = new Set(prev)
                                        if (e.target.checked) next.add(r.id)
                                        else next.delete(r.id)
                                        return next
                                    })
                                }}
                            />
                            <span className="space-y-0.5 flex-1">
                                <span className="flex items-center gap-2">
                                    <span className="font-medium">{r.name}</span>
                                    {bankedByRestaurant[r.id] > 0 && (
                                        <span className="text-xs rounded-full px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200">
                                            +{formatCredit(bankedByRestaurant[r.id])} banked
                                        </span>
                                    )}
                                </span>
                                {r.notes && (
                                    <span className="block text-xs text-neutral-500">
                                        {r.notes}
                                    </span>
                                )}
                            </span>
                        </label>
                    </li>
                ))}
            </ul>

            <div className="flex items-center justify-between text-sm">
                <p className="text-neutral-500">
                    {weightLabel
                        ? `Each pick gets ${weightLabel}.`
                        : 'Pick one or more restaurants. Your credit splits evenly across them.'}
                </p>
                <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
                >
                    {pending
                        ? 'Saving…'
                        : initialPicks.length === 0
                          ? 'Submit vote'
                          : picks.size === 0
                            ? 'Withdraw vote'
                            : 'Update vote'}
                </button>
            </div>

            {state && !state.ok && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {state.error}
                </p>
            )}
            {state && state.ok && (
                <p className="text-sm text-green-700 dark:text-green-300">
                    {state.savedCount === 0 ? 'Vote withdrawn.' : 'Vote saved.'}
                </p>
            )}
        </form>
    )
}

function formatCredit(n: number): string {
    // Trim trailing zeros after up to 2 decimal places.
    return n
        .toFixed(2)
        .replace(/\.?0+$/, '')
}
