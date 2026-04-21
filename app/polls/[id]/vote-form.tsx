'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BallotRow, BallotRowExpand } from '@/components/poll/BallotRow'
import { BankedCreditChip } from '@/components/ui/BankedCreditChip'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { cn } from '@/lib/cn'
import type { RichContent } from '@/lib/rich-content'

export type Ballot = {
    id: string
    name: string
    notes: string | null
    doordash_url: string | null
    rich_content: RichContent | null
    disabled: boolean
}

type Status = 'blank' | 'saving' | 'saved' | 'error'

type SubmitResult =
    | { ok: true; savedCount: number }
    | { ok: false; error: string }

const DEBOUNCE_MS = 400
const RETRY_DELAY_MS = 1000

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
    const router = useRouter()

    const [picks, setPicks] = useState<Set<string>>(new Set(initialPicks))
    const [status, setStatus] = useState<Status>('blank')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [expanded, setExpanded] = useState<Set<string>>(new Set())

    const toggleExpanded = (id: string) => {
        setExpanded((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const inFlightRef = useRef(false)
    const pendingRef = useRef(false)
    const retriedRef = useRef(false)
    // Updated synchronously in every picks-mutating handler so a
    // pagehide firing between the handler and React's commit still
    // sees the latest picks.
    const picksRef = useRef(picks)

    const url = `/api/polls/${pollId}/vote`

    async function sendVoteRequest(
        picksToSave: string[],
    ): Promise<SubmitResult | 'network-error'> {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ picks: picksToSave }),
            })
            if (!res.ok) return 'network-error'
            return (await res.json()) as SubmitResult
        } catch {
            return 'network-error'
        }
    }

    function clearTimers() {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
            debounceRef.current = null
        }
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current)
            retryTimerRef.current = null
        }
    }

    async function performSave() {
        if (inFlightRef.current) {
            pendingRef.current = true
            return
        }
        inFlightRef.current = true
        const snapshot = Array.from(picksRef.current)
        const result = await sendVoteRequest(snapshot)
        inFlightRef.current = false

        if (result === 'network-error') {
            if (!retriedRef.current) {
                retriedRef.current = true
                retryTimerRef.current = setTimeout(() => {
                    retryTimerRef.current = null
                    void performSave()
                }, RETRY_DELAY_MS)
                return
            }
            retriedRef.current = false
            setStatus('error')
            setErrorMessage("Couldn't save — check your connection.")
            return
        }

        retriedRef.current = false

        if (!result.ok) {
            setStatus('error')
            setErrorMessage(result.error)
            pendingRef.current = false
            return
        }

        setErrorMessage(null)
        if (pendingRef.current) {
            pendingRef.current = false
            void performSave()
            return
        }
        setStatus('saved')
        router.refresh()
    }

    function scheduleSave() {
        clearTimers()
        // User interaction resets the auto-retry cycle so the next save
        // failure gets a fresh retry attempt.
        retriedRef.current = false
        setStatus('saving')
        debounceRef.current = setTimeout(() => {
            debounceRef.current = null
            void performSave()
        }, DEBOUNCE_MS)
    }

    function togglePick(restaurantId: string, next: boolean, disabled: boolean) {
        // Disabled options can only be unvoted, never re-checked.
        if (next && disabled) return
        const nextSet = new Set(picksRef.current)
        if (next) nextSet.add(restaurantId)
        else nextSet.delete(restaurantId)
        picksRef.current = nextSet
        setPicks(nextSet)
        scheduleSave()
    }

    function clearPicks() {
        const emptySet = new Set<string>()
        picksRef.current = emptySet
        setPicks(emptySet)
        scheduleSave()
    }

    function retry() {
        retriedRef.current = false
        setStatus('saving')
        void performSave()
    }

    useEffect(() => {
        function flush() {
            if (!debounceRef.current && !inFlightRef.current) return
            if (debounceRef.current) {
                clearTimeout(debounceRef.current)
                debounceRef.current = null
            }
            const snapshot = Array.from(picksRef.current)
            try {
                void fetch(url, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ picks: snapshot }),
                    keepalive: true,
                })
            } catch {
                // User is leaving; nothing more to do.
            }
        }
        function onVisibilityChange() {
            if (document.visibilityState === 'hidden') flush()
        }
        function onPageHide() {
            flush()
        }
        document.addEventListener('visibilitychange', onVisibilityChange)
        window.addEventListener('pagehide', onPageHide)
        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange)
            window.removeEventListener('pagehide', onPageHide)
            flush()
            clearTimers()
        }
    }, [url])

    const weightLabel = useMemo(() => {
        if (picks.size === 0) return null
        return picks.size === 1 ? '1 credit' : `1/${picks.size} credit`
    }, [picks])

    return (
        <div className="space-y-4">
            <Card className="p-0 overflow-hidden">
                <ul className="divide-y divide-[color:var(--border-subtle)]">
                    {ballot.map((r) => {
                        const banked = bankedByRestaurant[r.id] ?? 0
                        const isChecked = picks.has(r.id)
                        // When the option is disabled and the user doesn't
                        // currently have it picked, the checkbox is fully
                        // uninteractable. When they do have it picked, the
                        // checkbox stays clickable so they can unvote; once
                        // unchecked, the next render will see isChecked=false
                        // and lock it down.
                        const uninteractable = r.disabled && !isChecked
                        const rowId = `ballot-row-${r.id}`
                        const isExpanded = expanded.has(r.id)
                        return (
                            <li key={r.id}>
                                <label
                                    className={cn(
                                        'block transition-colors duration-150',
                                        uninteractable
                                            ? 'bg-[color:var(--surface-sunken)] cursor-not-allowed'
                                            : 'cursor-pointer hover:bg-[color:var(--surface-sunken)]',
                                    )}
                                >
                                    <BallotRow
                                        name={r.name}
                                        doordashUrl={r.doordash_url}
                                        notes={r.notes}
                                        richContent={r.rich_content}
                                        leading={
                                            <Checkbox
                                                checked={isChecked}
                                                disabled={uninteractable}
                                                onCheckedChange={(next) => {
                                                    togglePick(
                                                        r.id,
                                                        next === true,
                                                        r.disabled,
                                                    )
                                                }}
                                            />
                                        }
                                        nameSuffix={
                                            <>
                                                {r.disabled && (
                                                    <span className="inline-flex items-center rounded-[var(--radius-pill)] px-2 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wide bg-[color:var(--surface-raised)] text-[color:var(--text-secondary)] border border-[color:var(--border-subtle)]">
                                                        Removed
                                                    </span>
                                                )}
                                                {banked > 0 && (
                                                    <BankedCreditChip
                                                        weight={banked}
                                                        restaurantName={r.name}
                                                    />
                                                )}
                                            </>
                                        }
                                        muted={r.disabled}
                                        expanded={isExpanded}
                                        onToggleExpanded={() =>
                                            toggleExpanded(r.id)
                                        }
                                        rowId={rowId}
                                    />
                                </label>
                                {isExpanded && r.rich_content && (
                                    <BallotRowExpand
                                        richContent={r.rich_content}
                                        notes={r.notes}
                                        rowId={rowId}
                                    />
                                )}
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
                        'Pick at least one restaurant.'
                    )}
                </p>
                <div className="flex items-center gap-3">
                    <StatusIndicator
                        status={status}
                        errorMessage={errorMessage}
                        onRetry={retry}
                    />
                    {picks.size > 0 && (
                        <Button
                            type="button"
                            variant="ghost-destructive"
                            size="sm"
                            onClick={clearPicks}
                        >
                            Clear my picks
                        </Button>
                    )}
                </div>
            </div>

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
        </div>
    )
}

function StatusIndicator({
    status,
    errorMessage,
    onRetry,
}: {
    status: Status
    errorMessage: string | null
    onRetry: () => void
}) {
    const tone =
        status === 'saved'
            ? 'text-[color:var(--status-open-fg)]'
            : status === 'error'
              ? 'text-danger-700 dark:text-danger-400'
              : 'text-[color:var(--text-secondary)]'
    return (
        <span
            aria-live="polite"
            role={status === 'error' ? 'alert' : undefined}
            className={cn(
                'inline-flex items-center gap-2 text-[0.8125rem]',
                tone,
                status === 'blank' && 'sr-only',
            )}
        >
            {status === 'saving' && 'Saving…'}
            {status === 'saved' && 'Saved'}
            {status === 'error' && (
                <>
                    {errorMessage ?? "Couldn't save."}
                    <button
                        type="button"
                        onClick={onRetry}
                        className="underline underline-offset-2 font-medium"
                    >
                        Retry
                    </button>
                </>
            )}
        </span>
    )
}
