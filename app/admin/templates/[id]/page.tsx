import { notFound } from 'next/navigation'
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

export default async function TemplateEditPage({ params }: { params: Params }) {
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
            .select('restaurant_id, accumulated_credits, is_active')
            .eq('template_id', id),
    ])

    const template = templateRes.data
    if (!template) notFound()

    const restaurants = restaurantsRes.data ?? []
    const assignments = assignmentsRes.data ?? []
    const schedule = (template.schedule ?? {}) as Schedule

    const assignmentMap = new Map<string, { credits: number; active: boolean }>(
        assignments.map((a) => [
            a.restaurant_id,
            { credits: Number(a.accumulated_credits), active: a.is_active },
        ]),
    )

    return (
        <main className="p-8 space-y-8 max-w-4xl">
            <header>
                <h1 className="text-2xl font-semibold">{template.name}</h1>
                <p className="text-sm text-neutral-500">Template settings and restaurant assignments.</p>
            </header>

            <form action={updateTemplate} className="space-y-4 border rounded-md p-4">
                <input type="hidden" name="id" value={template.id} />
                <div className="grid gap-3">
                    <label className="grid gap-1">
                        <span className="text-sm font-medium">Name</span>
                        <input
                            name="name"
                            defaultValue={template.name}
                            required
                            className="border rounded-md px-3 py-2 bg-transparent"
                        />
                    </label>
                    <label className="grid gap-1">
                        <span className="text-sm font-medium">Description</span>
                        <input
                            name="description"
                            defaultValue={template.description ?? ''}
                            className="border rounded-md px-3 py-2 bg-transparent"
                        />
                    </label>

                    <fieldset className="border rounded-md p-3 space-y-3">
                        <legend className="text-sm font-medium px-1">Schedule</legend>

                        <div className="flex flex-wrap gap-3">
                            {DAYS.map((d) => (
                                <label key={d.num} className="flex items-center gap-1 text-sm">
                                    <input
                                        type="checkbox"
                                        name="days_of_week"
                                        value={d.num}
                                        defaultChecked={schedule.days_of_week?.includes(d.num) ?? false}
                                    />
                                    {d.label}
                                </label>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-3 items-end">
                            <label className="grid gap-1">
                                <span className="text-xs text-neutral-500">Opens (local)</span>
                                <input
                                    name="opens_at_local"
                                    type="time"
                                    defaultValue={schedule.opens_at_local ?? '10:00'}
                                    required
                                    className="border rounded-md px-2 py-1 bg-transparent"
                                />
                            </label>
                            <label className="grid gap-1">
                                <span className="text-xs text-neutral-500">Closes (local)</span>
                                <input
                                    name="closes_at_local"
                                    type="time"
                                    defaultValue={schedule.closes_at_local ?? '11:30'}
                                    required
                                    className="border rounded-md px-2 py-1 bg-transparent"
                                />
                            </label>
                            <label className="grid gap-1">
                                <span className="text-xs text-neutral-500">Timezone (IANA)</span>
                                <input
                                    name="timezone"
                                    defaultValue={schedule.timezone ?? 'America/Los_Angeles'}
                                    required
                                    className="border rounded-md px-2 py-1 bg-transparent min-w-[220px]"
                                />
                            </label>
                        </div>
                    </fieldset>

                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="is_active" defaultChecked={template.is_active} />
                        Template is active (will instantiate polls on schedule)
                    </label>
                </div>
                <button
                    type="submit"
                    className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800"
                >
                    Save template
                </button>
            </form>

            <form action={updateAssignments} className="space-y-4 border rounded-md p-4">
                <input type="hidden" name="id" value={template.id} />
                <h2 className="text-lg font-medium">Restaurants</h2>
                <p className="text-xs text-neutral-500">
                    Checked restaurants are part of this template&apos;s ballot. Unchecking a previously-checked
                    restaurant soft-deactivates the assignment — accumulated credits are preserved and
                    restored if you re-check it later.
                </p>
                {restaurants.length === 0 ? (
                    <p className="text-sm text-neutral-500">
                        No restaurants in the catalog yet — add some under Restaurants first.
                    </p>
                ) : (
                    <div className="divide-y border rounded-md">
                        {restaurants.map((r) => {
                            const current = assignmentMap.get(r.id)
                            const isCheckedByDefault = !!(current && current.active)
                            const dimmed = !r.is_active && !isCheckedByDefault
                            return (
                                <label
                                    key={r.id}
                                    className={`p-3 flex items-center gap-3 text-sm ${
                                        dimmed ? 'opacity-50' : ''
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        name="restaurant_ids"
                                        value={r.id}
                                        defaultChecked={isCheckedByDefault}
                                        disabled={dimmed}
                                    />
                                    <span className="flex-1">{r.name}</span>
                                    {!r.is_active && (
                                        <span className="text-xs text-neutral-500">
                                            (catalog inactive)
                                        </span>
                                    )}
                                    {current && (
                                        <span className="text-xs text-neutral-500 tabular-nums">
                                            balance: {current.credits.toFixed(3)}
                                        </span>
                                    )}
                                </label>
                            )
                        })}
                    </div>
                )}
                <button
                    type="submit"
                    className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800"
                >
                    Save assignments
                </button>
            </form>
        </main>
    )
}
