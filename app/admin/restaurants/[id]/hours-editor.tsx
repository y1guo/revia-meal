'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Switch } from '@/components/ui/Switch'
import { TextInput } from '@/components/ui/TextInput'
import { saveRestaurantHoursAction } from '../actions'

export type DayHours = {
    day_of_week: number // 1..7 (Mon..Sun)
    open: boolean
    opens_at: string | null // "HH:MM"
    closes_at: string | null
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

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

type Props = {
    restaurantId: string
    initialHours: DayHours[]
    /** True when the DB has zero rows — the "unconfigured, open every day" sentinel state. */
    unconfigured: boolean
}

export function HoursEditor({ restaurantId, initialHours, unconfigured }: Props) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const [days, setDays] = useState<DayHours[]>(() =>
        initialHours.map((d) => ({ ...d })),
    )
    const [error, setError] = useState<string | null>(null)

    const initialKey = useMemo(() => serialize(initialHours), [initialHours])
    const dirty = serialize(days) !== initialKey

    const updateDay = (dow: number, patch: Partial<DayHours>) => {
        setDays((prev) =>
            prev.map((d) =>
                d.day_of_week === dow ? { ...d, ...patch } : d,
            ),
        )
        setError(null)
    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        // Local validation mirrors the server; the server is still authoritative.
        if (!days.some((d) => d.open)) {
            setError(
                'At least one day must be open. To hide a restaurant entirely, use the Active toggle above.',
            )
            return
        }
        for (const d of days) {
            if (!d.open) continue
            const hasOpens = (d.opens_at ?? '').trim() !== ''
            const hasCloses = (d.closes_at ?? '').trim() !== ''
            if (hasOpens !== hasCloses) {
                setError(
                    `${DAY_LABELS[d.day_of_week]}: fill both open and close times, or leave both blank.`,
                )
                return
            }
            if (hasOpens && !TIME_RE.test((d.opens_at ?? '').trim())) {
                setError(`${DAY_LABELS[d.day_of_week]}: invalid open time.`)
                return
            }
            if (hasCloses && !TIME_RE.test((d.closes_at ?? '').trim())) {
                setError(`${DAY_LABELS[d.day_of_week]}: invalid close time.`)
                return
            }
        }
        setError(null)
        const fd = new FormData()
        fd.append('restaurant_id', restaurantId)
        for (const d of days) {
            if (d.open) fd.append(`day_${d.day_of_week}_open`, '1')
            if (d.opens_at)
                fd.append(`day_${d.day_of_week}_opens`, d.opens_at.trim())
            if (d.closes_at)
                fd.append(`day_${d.day_of_week}_closes`, d.closes_at.trim())
        }
        startTransition(async () => {
            try {
                await saveRestaurantHoursAction(fd)
                router.refresh()
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Save failed.')
            }
        })
    }

    return (
        <Card>
            <h2 className="font-display font-medium text-[1rem] text-[color:var(--text-primary)] mb-1">
                Weekly hours
            </h2>
            <p className="text-[0.8125rem] text-[color:var(--text-secondary)] mb-4">
                Days marked closed are excluded from poll ballots on that day
                of the week. Times are optional — leave both blank to mean
                &ldquo;open all day.&rdquo; Restaurants with no configuration
                default to open every day.
                {unconfigured && (
                    <span className="block mt-1 text-[color:var(--text-tertiary)]">
                        Not yet configured: currently treated as open every
                        day.
                    </span>
                )}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3 max-w-[520px]">
                <ul className="divide-y divide-[color:var(--border-subtle)] rounded-[var(--radius-md)] border border-[color:var(--border-subtle)]">
                    {days.map((d) => (
                        <li
                            key={d.day_of_week}
                            className="flex flex-wrap items-center gap-3 px-3 py-2.5"
                        >
                            <span className="w-10 shrink-0 text-[0.875rem] font-medium text-[color:var(--text-primary)]">
                                {DAY_LABELS[d.day_of_week]}
                            </span>
                            <Switch
                                checked={d.open}
                                onCheckedChange={(next) =>
                                    updateDay(d.day_of_week, { open: next })
                                }
                                disabled={pending}
                                aria-label={`${DAY_LABELS[d.day_of_week]} open`}
                            />
                            <span className="text-[0.8125rem] text-[color:var(--text-secondary)] w-14 shrink-0">
                                {d.open ? 'Open' : 'Closed'}
                            </span>
                            <div className="flex items-center gap-1.5 ml-auto">
                                <TextInput
                                    type="time"
                                    value={d.opens_at ?? ''}
                                    onChange={(e) =>
                                        updateDay(d.day_of_week, {
                                            opens_at: e.target.value || null,
                                        })
                                    }
                                    disabled={!d.open || pending}
                                    className="w-[118px]"
                                    aria-label={`${DAY_LABELS[d.day_of_week]} opens at`}
                                />
                                <span className="text-[color:var(--text-tertiary)]">
                                    –
                                </span>
                                <TextInput
                                    type="time"
                                    value={d.closes_at ?? ''}
                                    onChange={(e) =>
                                        updateDay(d.day_of_week, {
                                            closes_at:
                                                e.target.value || null,
                                        })
                                    }
                                    disabled={!d.open || pending}
                                    className="w-[118px]"
                                    aria-label={`${DAY_LABELS[d.day_of_week]} closes at`}
                                />
                            </div>
                        </li>
                    ))}
                </ul>

                {error && (
                    <p
                        className="text-[0.8125rem] text-danger-700 dark:text-danger-400"
                        role="alert"
                    >
                        {error}
                    </p>
                )}

                <div className="pt-1">
                    <Button
                        type="submit"
                        variant="primary"
                        loading={pending}
                        disabled={pending || !dirty}
                    >
                        Save hours
                    </Button>
                </div>
            </form>
        </Card>
    )
}

function serialize(days: DayHours[]): string {
    return days
        .slice()
        .sort((a, b) => a.day_of_week - b.day_of_week)
        .map(
            (d) =>
                `${d.day_of_week}:${d.open ? '1' : '0'}:${d.opens_at ?? ''}:${d.closes_at ?? ''}`,
        )
        .join('|')
}
