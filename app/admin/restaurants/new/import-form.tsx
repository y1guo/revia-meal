'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { BallotRow, BallotRowExpand } from '@/components/poll/BallotRow'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { TextInput } from '@/components/ui/TextInput'
import type { DecodedPrefill } from '@/lib/rich-content'
import { addRestaurantFromImport } from '../actions'

type Props = {
    decoded: DecodedPrefill
    prefill: string
}

const DAY_LABELS: Record<number, string> = {
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat',
    7: 'Sun',
}

export function ImportForm({ decoded, prefill }: Props) {
    const router = useRouter()
    const [name, setName] = useState(decoded.name)
    const [doordashUrl, setDoordashUrl] = useState(decoded.doordash_url ?? '')
    const [notes, setNotes] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [pending, startTransition] = useTransition()
    const [expanded, setExpanded] = useState(false)

    const handleSubmit = (formData: FormData) => {
        setError(null)
        startTransition(async () => {
            try {
                const { id } = await addRestaurantFromImport(formData)
                router.push(`/admin/restaurants/${id}`)
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : 'Could not save.',
                )
            }
        })
    }

    return (
        <div className="space-y-4">
            <Card className="bg-[color:var(--status-pending-bg)] border-[color:var(--status-pending-fg)]/20">
                <p className="text-[0.875rem] text-[color:var(--text-primary)]">
                    <span className="font-medium">
                        Imported from DoorDash.
                    </span>{' '}
                    Review and edit before saving.
                </p>
                <a
                    href={decoded.rich_content.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-[0.8125rem] text-[color:var(--link-fg)] underline underline-offset-2"
                >
                    {decoded.rich_content.source_url} ↗
                </a>
            </Card>

            <Card>
                <h2 className="font-display font-medium text-[1rem] text-[color:var(--text-primary)] mb-4">
                    Preview
                </h2>
                <p className="text-[0.8125rem] text-[color:var(--text-secondary)] mb-3">
                    This is how the restaurant will appear on poll ballots.
                </p>
                <div className="overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-raised)]">
                    <BallotRow
                        name={name || decoded.name}
                        doordashUrl={doordashUrl || null}
                        notes={notes || null}
                        richContent={decoded.rich_content}
                        expanded={expanded}
                        onToggleExpanded={() => setExpanded((v) => !v)}
                        rowId="import-preview-row"
                    />
                    {expanded && (
                        <BallotRowExpand
                            richContent={decoded.rich_content}
                            notes={notes || null}
                            rowId="import-preview-row"
                        />
                    )}
                </div>
                {decoded.rich_content.hours && (
                    <div className="mt-4 space-y-2">
                        <h3 className="font-display font-medium text-[0.875rem] text-[color:var(--text-primary)]">
                            Weekly hours
                        </h3>
                        <p className="text-[0.75rem] text-[color:var(--text-tertiary)]">
                            Split lunch/dinner brackets are preserved here.
                            The hours editor on the restaurant page stores the
                            widest bracket per day &mdash; refine it there if
                            you need precision.
                        </p>
                        <ul className="divide-y divide-[color:var(--border-subtle)] rounded-[var(--radius-md)] border border-[color:var(--border-subtle)]">
                            {decoded.rich_content.hours.map((d) => (
                                <li
                                    key={d.day_of_week}
                                    className="flex flex-wrap items-baseline gap-3 px-3 py-2 text-[0.8125rem]"
                                >
                                    <span className="w-10 shrink-0 font-medium text-[color:var(--text-primary)]">
                                        {DAY_LABELS[d.day_of_week]}
                                    </span>
                                    {d.ranges.length === 0 ? (
                                        <span className="text-[color:var(--text-tertiary)]">
                                            Closed
                                        </span>
                                    ) : (
                                        <span className="font-mono tabular-nums text-[color:var(--text-secondary)]">
                                            {d.ranges
                                                .map(
                                                    (r) =>
                                                        `${r.opens_at}\u2013${r.closes_at}`,
                                                )
                                                .join(' · ')}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <details className="mt-4">
                    <summary className="cursor-pointer text-[0.8125rem] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]">
                        Raw payload
                    </summary>
                    <pre className="mt-2 p-3 rounded-[var(--radius-md)] bg-[color:var(--surface-sunken)] border border-[color:var(--border-subtle)] text-[0.75rem] leading-snug text-[color:var(--text-secondary)] overflow-auto max-h-[320px]">
                        {JSON.stringify(decoded.rich_content, null, 2)}
                    </pre>
                </details>
            </Card>

            <Card>
                <h2 className="font-display font-medium text-[1rem] text-[color:var(--text-primary)] mb-4">
                    Details
                </h2>
                <form action={handleSubmit} className="space-y-4 max-w-[520px]">
                    <input type="hidden" name="prefill" value={prefill} />

                    <label className="flex flex-col gap-1.5">
                        <span className="text-[0.875rem] font-medium text-[color:var(--text-primary)]">
                            Name
                        </span>
                        <TextInput
                            name="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-[0.875rem] font-medium text-[color:var(--text-primary)]">
                            DoorDash URL
                        </span>
                        <TextInput
                            name="doordash_url"
                            type="url"
                            value={doordashUrl}
                            onChange={(e) => setDoordashUrl(e.target.value)}
                            placeholder="https://www.doordash.com/store/…"
                        />
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-[0.875rem] font-medium text-[color:var(--text-primary)]">
                            Notes
                        </span>
                        <TextInput
                            name="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. Allergen info, order tips"
                        />
                        <span className="text-[0.75rem] text-[color:var(--text-secondary)]">
                            Internal memo (e.g. allergens, order tips). Shown
                            in the ballot row&apos;s Details panel.
                        </span>
                    </label>

                    <label className="flex items-start gap-3">
                        <Checkbox
                            name="is_active"
                            defaultChecked
                            value="on"
                            className="mt-0.5"
                        />
                        <span>
                            <span className="block text-[0.875rem] font-medium text-[color:var(--text-primary)]">
                                Active
                            </span>
                            <span className="block text-[0.75rem] text-[color:var(--text-secondary)]">
                                Inactive restaurants are hidden from new poll
                                ballots.
                            </span>
                        </span>
                    </label>

                    {error && (
                        <p
                            className="text-[0.8125rem] text-danger-700 dark:text-danger-400"
                            role="alert"
                        >
                            {error}
                        </p>
                    )}

                    <div className="pt-2 flex items-center gap-3">
                        <Button
                            type="submit"
                            variant="primary"
                            loading={pending}
                        >
                            Save to catalog
                        </Button>
                        <Link
                            href="/admin/restaurants"
                            className="text-[0.875rem] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </Card>
        </div>
    )
}
