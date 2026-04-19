'use client'

import Link from 'next/link'
import { useActionState, useMemo, useState } from 'react'
import { BankedCreditChip } from '@/components/ui/BankedCreditChip'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { cn } from '@/lib/cn'
import { submitVote, type SubmitVoteResult } from './actions'

export type Ballot = {
    id: string
    name: string
    notes: string | null
    doordash_url: string | null
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

    const submitLabel =
        initialPicks.length === 0
            ? 'Submit vote'
            : picks.size === 0
              ? 'Withdraw vote'
              : 'Update vote'

    return (
        <form action={action} className="space-y-4">
            <input type="hidden" name="poll_id" value={pollId} />

            <Card className="p-0 overflow-hidden">
                <ul className="divide-y divide-[color:var(--border-subtle)]">
                    {ballot.map((r) => {
                        const banked = bankedByRestaurant[r.id] ?? 0
                        const isChecked = picks.has(r.id)
                        return (
                            <li key={r.id}>
                                <label
                                    className={cn(
                                        'flex items-start gap-3',
                                        'px-4 py-3 md:px-5 md:py-4',
                                        'cursor-pointer',
                                        'hover:bg-[color:var(--surface-sunken)]',
                                        'transition-colors duration-150',
                                    )}
                                >
                                    <Checkbox
                                        key={`${r.id}-${initialKey}`}
                                        name="picks"
                                        value={r.id}
                                        defaultChecked={initialPicks.includes(
                                            r.id,
                                        )}
                                        className="mt-0.5"
                                        onCheckedChange={(next) => {
                                            setPicks((prev) => {
                                                const nextSet = new Set(prev)
                                                if (next === true)
                                                    nextSet.add(r.id)
                                                else nextSet.delete(r.id)
                                                return nextSet
                                            })
                                        }}
                                    />
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={cn(
                                                    'font-medium text-[color:var(--text-primary)]',
                                                    isChecked
                                                        ? 'text-[color:var(--text-primary)]'
                                                        : '',
                                                )}
                                            >
                                                {r.name}
                                            </span>
                                            {banked > 0 && (
                                                <BankedCreditChip
                                                    weight={banked}
                                                    restaurantName={r.name}
                                                />
                                            )}
                                        </div>
                                        {r.doordash_url && (
                                            <a
                                                href={r.doordash_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-block text-[0.8125rem] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] underline underline-offset-2"
                                            >
                                                DoorDash ↗
                                            </a>
                                        )}
                                        {r.notes && (
                                            <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
                                                {r.notes}
                                            </p>
                                        )}
                                    </div>
                                </label>
                            </li>
                        )
                    })}
                </ul>
            </Card>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
                    {weightLabel ? (
                        <>
                            You picked {picks.size} ·{' '}
                            <span className="font-mono tabular-nums">
                                each counts as {weightLabel}
                            </span>
                        </>
                    ) : (
                        'Pick at least one restaurant to submit.'
                    )}
                </p>
                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={picks.size === 0 && initialPicks.length === 0}
                    loading={pending}
                >
                    {submitLabel}
                </Button>
            </div>

            {state && !state.ok && (
                <p
                    className="text-[0.875rem] text-tomato-500"
                    role="alert"
                >
                    {state.error}
                </p>
            )}
            {state && state.ok && (
                <p
                    className="text-[0.875rem] text-[color:var(--status-open-fg)]"
                    aria-live="polite"
                >
                    {state.savedCount === 0 ? 'Vote withdrawn.' : 'Vote saved.'}
                </p>
            )}

            <p className="text-[0.75rem] text-[color:var(--text-tertiary)]">
                Each pick splits your credit evenly. Banked credits from past
                polls boost restaurants you pick today.{' '}
                <Link
                    href="/docs#banked-credits"
                    className="text-[color:var(--link-fg)] underline underline-offset-2"
                >
                    How this works →
                </Link>
            </p>
        </form>
    )
}
