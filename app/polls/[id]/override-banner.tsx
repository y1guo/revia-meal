import { Shuffle } from 'lucide-react'
import { formatDateTime } from '@/lib/format-time'

export type OverrideEntry = {
    overriddenAt: string
    overriddenByName: string | null
    oldWinnerName: string
    newWinnerName: string
    reason: string | null
}

/**
 * Banner shown above ClosedBreakdown on /polls/:id when at least one
 * override has been recorded for that poll. The most recent override drives
 * the headline; prior overrides are collapsed into a disclosure.
 */
export function OverrideBanner({
    overrides,
}: {
    overrides: OverrideEntry[]
}) {
    if (overrides.length === 0) return null
    const [latest, ...rest] = overrides

    return (
        <div
            className="mb-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-raised)] overflow-hidden"
            role="note"
            aria-label="Winner overridden"
        >
            <div className="flex items-start gap-3 px-4 py-3">
                <Shuffle
                    size={18}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-[color:var(--accent-brand)]"
                />
                <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[0.875rem] text-[color:var(--text-primary)]">
                        <span className="font-medium">Winner overridden</span>
                        {latest.overriddenByName
                            ? ` by ${latest.overriddenByName}`
                            : ''}{' '}
                        ·{' '}
                        <span className="text-[color:var(--text-secondary)] tabular-nums">
                            {formatDateTime(latest.overriddenAt)}
                        </span>
                    </p>
                    <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
                        was{' '}
                        <span className="font-medium text-[color:var(--text-primary)]">
                            {latest.oldWinnerName}
                        </span>{' '}
                        → now{' '}
                        <span className="font-medium text-[color:var(--text-primary)]">
                            {latest.newWinnerName}
                        </span>
                    </p>
                    {latest.reason && (
                        <p className="text-[0.8125rem] italic text-[color:var(--text-secondary)]">
                            &ldquo;{latest.reason}&rdquo;
                        </p>
                    )}
                </div>
            </div>
            {rest.length > 0 && (
                <details className="border-t border-[color:var(--border-subtle)]">
                    <summary className="cursor-pointer select-none px-4 py-2 text-[0.8125rem] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-sunken)] transition-colors duration-150">
                        History ({rest.length + 1} changes)
                    </summary>
                    <ol className="px-4 pb-3 space-y-2 text-[0.8125rem] text-[color:var(--text-secondary)]">
                        <li className="pt-1">
                            <span className="tabular-nums">
                                {formatDateTime(latest.overriddenAt)}
                            </span>
                            {' — '}
                            {latest.overriddenByName ?? 'admin'} ·{' '}
                            <span className="font-medium text-[color:var(--text-primary)]">
                                {latest.oldWinnerName}
                            </span>{' '}
                            → {latest.newWinnerName}
                            {latest.reason ? ` · "${latest.reason}"` : ''}
                        </li>
                        {rest.map((o) => (
                            <li key={o.overriddenAt}>
                                <span className="tabular-nums">
                                    {formatDateTime(o.overriddenAt)}
                                </span>
                                {' — '}
                                {o.overriddenByName ?? 'admin'} ·{' '}
                                <span className="font-medium text-[color:var(--text-primary)]">
                                    {o.oldWinnerName}
                                </span>{' '}
                                → {o.newWinnerName}
                                {o.reason ? ` · "${o.reason}"` : ''}
                            </li>
                        ))}
                    </ol>
                </details>
            )}
        </div>
    )
}
