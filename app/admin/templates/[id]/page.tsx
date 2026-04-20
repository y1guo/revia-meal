import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shell/PageHeader'
import { BackLink } from '@/components/ui/BackLink'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { TextInput } from '@/components/ui/TextInput'
import { cn } from '@/lib/cn'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateTemplate, updateAssignments } from './actions'

type Params = Promise<{ id: string }>

type Schedule = {
    days_of_week?: number[]
    opens_at_local?: string
    closes_at_local?: string
    timezone?: string
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

export async function generateMetadata({
    params,
}: {
    params: Params
}): Promise<Metadata> {
    const { id } = await params
    const admin = createAdminClient()
    const { data } = await admin
        .from('poll_templates')
        .select('name')
        .eq('id', id)
        .maybeSingle()
    const name = data?.name ?? 'Template'
    return { title: `${name} · Templates · Admin` }
}

export default async function TemplateEditPage({
    params,
}: {
    params: Params
}) {
    const { id } = await params
    const admin = createAdminClient()

    const [templateRes, restaurantsRes, assignmentsRes] = await Promise.all([
        admin
            .from('poll_templates')
            .select('id, name, description, schedule, is_active')
            .eq('id', id)
            .maybeSingle(),
        admin
            .from('restaurants')
            .select('id, name, is_active')
            .order('name'),
        admin
            .from('template_restaurants')
            .select('restaurant_id, is_active')
            .eq('template_id', id),
    ])

    const template = templateRes.data
    if (!template) notFound()

    const restaurants = restaurantsRes.data ?? []
    const assignments = assignmentsRes.data ?? []
    const schedule = (template.schedule ?? {}) as Schedule

    const assignmentMap = new Map<string, { active: boolean }>(
        assignments.map((a) => [a.restaurant_id, { active: a.is_active }]),
    )

    return (
        <>
            <BackLink href="/admin/templates">All templates</BackLink>
            <PageHeader
                title={template.name}
                subtitle="Template settings and restaurant assignments."
            />

            <div className="space-y-6">
                <Card>
                    <form action={updateTemplate} className="space-y-4">
                        <input
                            type="hidden"
                            name="id"
                            value={template.id}
                        />
                        <div className="space-y-3">
                            <label className="flex flex-col gap-1.5">
                                <span className="text-[0.875rem] font-medium text-[color:var(--text-primary)]">
                                    Name
                                </span>
                                <TextInput
                                    name="name"
                                    defaultValue={template.name}
                                    required
                                />
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className="text-[0.875rem] font-medium text-[color:var(--text-primary)]">
                                    Description
                                </span>
                                <TextInput
                                    name="description"
                                    defaultValue={template.description ?? ''}
                                />
                            </label>
                        </div>

                        <fieldset className="rounded-[var(--radius-md)] bg-[color:var(--surface-sunken)] p-4 space-y-3">
                            <legend className="text-[0.875rem] font-medium text-[color:var(--text-primary)] px-1">
                                Schedule
                            </legend>

                            <div>
                                <div className="text-[0.75rem] font-medium text-[color:var(--text-secondary)] mb-2">
                                    Days of week
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {DAYS.map((d) => {
                                        const checked =
                                            schedule.days_of_week?.includes(
                                                d.num,
                                            ) ?? false
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
                                                    name="days_of_week"
                                                    value={d.num}
                                                    defaultChecked={checked}
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
                                    <TextInput
                                        name="opens_at_local"
                                        type="time"
                                        defaultValue={
                                            schedule.opens_at_local ?? '10:00'
                                        }
                                        required
                                        size="sm"
                                        className="w-[140px]"
                                    />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-[0.75rem] font-medium text-[color:var(--text-secondary)]">
                                        Closes (local)
                                    </span>
                                    <TextInput
                                        name="closes_at_local"
                                        type="time"
                                        defaultValue={
                                            schedule.closes_at_local ?? '11:30'
                                        }
                                        required
                                        size="sm"
                                        className="w-[140px]"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 flex-1 min-w-[220px]">
                                    <span className="text-[0.75rem] font-medium text-[color:var(--text-secondary)]">
                                        Timezone (IANA)
                                    </span>
                                    <TextInput
                                        name="timezone"
                                        defaultValue={
                                            schedule.timezone ??
                                            'America/Los_Angeles'
                                        }
                                        required
                                        size="sm"
                                    />
                                </label>
                            </div>
                        </fieldset>

                        <label className="flex items-center gap-2 text-[0.875rem]">
                            <input
                                type="checkbox"
                                name="is_active"
                                defaultChecked={template.is_active}
                                className="h-4 w-4 accent-[color:var(--accent-brand)]"
                            />
                            Template is active (will instantiate polls on
                            schedule)
                        </label>

                        <div>
                            <Button type="submit" variant="primary">
                                Save template
                            </Button>
                        </div>
                    </form>
                </Card>

                <Card>
                    <form action={updateAssignments} className="space-y-4">
                        <input
                            type="hidden"
                            name="id"
                            value={template.id}
                        />
                        <div>
                            <h2 className="font-display font-medium text-[1rem] text-[color:var(--text-primary)]">
                                Restaurants
                            </h2>
                            <p className="text-[0.8125rem] text-[color:var(--text-secondary)] mt-1">
                                Checked restaurants are part of this
                                template&apos;s ballot. Unchecking soft-
                                deactivates the assignment — users keep their
                                banked credits, re-checking restores the option
                                on future ballots.
                            </p>
                        </div>
                        {restaurants.length === 0 ? (
                            <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
                                No restaurants in the catalog yet — add some
                                under Restaurants first.
                            </p>
                        ) : (
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {restaurants.map((r) => {
                                    const current = assignmentMap.get(r.id)
                                    const isCheckedByDefault = !!(
                                        current && current.active
                                    )
                                    const dimmed =
                                        !r.is_active && !isCheckedByDefault
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
                                            <input
                                                type="checkbox"
                                                name="restaurant_ids"
                                                value={r.id}
                                                defaultChecked={isCheckedByDefault}
                                                disabled={dimmed}
                                                className="h-4 w-4 accent-[color:var(--accent-brand)]"
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
                        <div>
                            <Button type="submit" variant="primary">
                                Save assignments
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </>
    )
}
