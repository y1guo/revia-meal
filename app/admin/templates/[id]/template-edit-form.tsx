'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { Chip } from '@/components/ui/Chip'
import { TextInput } from '@/components/ui/TextInput'
import { TimeInput } from '@/components/ui/TimeInput'
import { TimezoneSelect } from '@/components/ui/TimezoneSelect'
import { cn } from '@/lib/cn'
import { saveTemplate } from './actions'

type Schedule = {
    days_of_week: number[]
    opens_at_local: string
    closes_at_local: string
    timezone: string
}

type Restaurant = {
    id: string
    name: string
    is_active: boolean
}

type Props = {
    template: {
        id: string
        name: string
        description: string | null
        schedule: Schedule
        is_active: boolean
    }
    restaurants: Restaurant[]
    assignments: Array<{ restaurant_id: string; is_active: boolean }>
}

const DAYS = [
    { num: 1, label: 'Mon' },
    { num: 2, label: 'Tue' },
    { num: 3, label: 'Wed' },
    { num: 4, label: 'Thu' },
    { num: 5, label: 'Fri' },
    { num: 6, label: 'Sat' },
    { num: 7, label: 'Sun' },
]

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export function TemplateEditForm({ template, restaurants, assignments }: Props) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const [name, setName] = useState(template.name)
    const [description, setDescription] = useState(template.description ?? '')
    const [isActive, setIsActive] = useState(template.is_active)
    const [daysOfWeek, setDaysOfWeek] = useState<Set<number>>(
        new Set(template.schedule.days_of_week ?? []),
    )
    const [opensAt, setOpensAt] = useState(
        template.schedule.opens_at_local ?? '10:00',
    )
    const [closesAt, setClosesAt] = useState(
        template.schedule.closes_at_local ?? '11:30',
    )
    const [timezone, setTimezone] = useState(
        template.schedule.timezone ?? 'America/Los_Angeles',
    )

    // Controlled assignment set — seeded from the active assignments so the
    // UI doesn't flicker back on save (the old uncontrolled defaultChecked
    // caused that). Inactive restaurants without an existing active assignment
    // can't be added.
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
        new Set(
            assignments.filter((a) => a.is_active).map((a) => a.restaurant_id),
        ),
    )

    const toggleDay = (n: number) => {
        setDaysOfWeek((prev) => {
            const next = new Set(prev)
            if (next.has(n)) next.delete(n)
            else next.add(n)
            return next
        })
    }

    const toggleRestaurant = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)
        if (!TIME_RE.test(opensAt) || !TIME_RE.test(closesAt)) {
            setError('Opens and closes times must be in HH:MM format.')
            return
        }
        if (daysOfWeek.size === 0) {
            setError('Select at least one day of the week.')
            return
        }
        startTransition(async () => {
            try {
                await saveTemplate({
                    id: template.id,
                    name,
                    description: description || null,
                    is_active: isActive,
                    schedule: {
                        days_of_week: Array.from(daysOfWeek).sort(
                            (a, b) => a - b,
                        ),
                        opens_at_local: opensAt,
                        closes_at_local: closesAt,
                        timezone,
                    },
                    restaurant_ids: Array.from(selectedIds),
                })
                router.refresh()
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : 'Could not save.',
                )
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <div className="space-y-4">
                    <div className="space-y-3">
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
                                Description
                            </span>
                            <TextInput
                                name="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </label>
                    </div>

                    <div
                        role="group"
                        aria-labelledby="schedule-heading"
                        className="flex flex-col gap-1.5"
                    >
                        <span
                            id="schedule-heading"
                            className="text-[0.875rem] font-medium text-[color:var(--text-primary)]"
                        >
                            Schedule
                        </span>
                        <div className="rounded-[var(--radius-md)] bg-[color:var(--surface-sunken)] p-4 space-y-3">
                        <div>
                            <div className="text-[0.75rem] font-medium text-[color:var(--text-secondary)] mb-2">
                                Days of week
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {DAYS.map((d) => {
                                    const checked = daysOfWeek.has(d.num)
                                    return (
                                        <label
                                            key={d.num}
                                            className={cn(
                                                'relative inline-flex items-center justify-center',
                                                'h-8 px-3 rounded-full cursor-pointer',
                                                'text-[0.8125rem] font-medium',
                                                'border transition-colors duration-150',
                                                'has-[:checked]:bg-[color:var(--accent-brand)] has-[:checked]:border-[color:var(--accent-brand)] has-[:checked]:text-[color:var(--text-on-accent)]',
                                                'border-[color:var(--border-subtle)] bg-[color:var(--surface-raised)] text-[color:var(--text-secondary)]',
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() =>
                                                    toggleDay(d.num)
                                                }
                                                className="sr-only"
                                            />
                                            {d.label}
                                        </label>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <label className="flex flex-col gap-1">
                                <span className="text-[0.75rem] font-medium text-[color:var(--text-secondary)]">
                                    Opens (local)
                                </span>
                                <TimeInput
                                    value={opensAt}
                                    onChange={setOpensAt}
                                    required
                                    aria-label="Opens at (local)"
                                    className="w-[140px]"
                                />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-[0.75rem] font-medium text-[color:var(--text-secondary)]">
                                    Closes (local)
                                </span>
                                <TimeInput
                                    value={closesAt}
                                    onChange={setClosesAt}
                                    required
                                    aria-label="Closes at (local)"
                                    className="w-[140px]"
                                />
                            </label>
                            <label className="flex flex-col gap-1 flex-1 min-w-[220px]">
                                <span className="text-[0.75rem] font-medium text-[color:var(--text-secondary)]">
                                    Timezone
                                </span>
                                <TimezoneSelect
                                    value={timezone}
                                    onChange={setTimezone}
                                    required
                                    aria-label="Timezone"
                                />
                            </label>
                        </div>
                        </div>
                    </div>

                    <label className="flex items-center gap-2 text-[0.875rem] cursor-pointer">
                        <Checkbox
                            checked={isActive}
                            onCheckedChange={(v) => setIsActive(v === true)}
                        />
                        Template is active (will instantiate polls on schedule)
                    </label>
                </div>
            </Card>

            <Card>
                <div className="space-y-4">
                    <div>
                        <h2 className="font-display font-medium text-[1rem] text-[color:var(--text-primary)]">
                            Restaurants
                        </h2>
                        <p className="text-[0.8125rem] text-[color:var(--text-secondary)] mt-1">
                            Checked restaurants are part of this template&apos;s
                            ballot. Unchecking soft-deactivates the assignment
                            — users keep their banked credits, re-checking
                            restores the option on future ballots.
                        </p>
                    </div>
                    {restaurants.length === 0 ? (
                        <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
                            No restaurants in the catalog yet — add some under
                            Restaurants first.
                        </p>
                    ) : (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {restaurants.map((r) => {
                                const checked = selectedIds.has(r.id)
                                const dimmed = !r.is_active && !checked
                                return (
                                    <label
                                        key={r.id}
                                        className={cn(
                                            'flex items-center gap-2',
                                            'px-3 py-2 rounded-[var(--radius-md)]',
                                            'bg-[color:var(--surface-sunken)]',
                                            'text-[0.875rem] cursor-pointer',
                                            dimmed &&
                                                'opacity-50 cursor-not-allowed',
                                        )}
                                    >
                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={() =>
                                                toggleRestaurant(r.id)
                                            }
                                            disabled={dimmed}
                                        />
                                        <span className="flex-1 truncate">
                                            {r.name}
                                        </span>
                                        {!r.is_active && (
                                            <Chip variant="neutral">
                                                inactive
                                            </Chip>
                                        )}
                                    </label>
                                )
                            })}
                        </div>
                    )}
                </div>
            </Card>

            {error && (
                <p
                    className="text-[0.8125rem] text-danger-700 dark:text-danger-400"
                    role="alert"
                >
                    {error}
                </p>
            )}

            <div className="sticky bottom-4 z-10 flex justify-end">
                <Button type="submit" variant="primary" loading={pending}>
                    Save changes
                </Button>
            </div>
        </form>
    )
}
