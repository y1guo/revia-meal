import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { createTemplate } from './actions'

type Schedule = {
    days_of_week?: number[]
    opens_at_local?: string
    closes_at_local?: string
    timezone?: string
}

const DAY_LABELS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function describeSchedule(s: Schedule): string {
    const days = (s.days_of_week ?? []).map((n) => DAY_LABELS[n] ?? '?').join(', ') || 'no days'
    const open = s.opens_at_local ?? '—'
    const close = s.closes_at_local ?? '—'
    const tz = s.timezone ?? '—'
    return `${days} · ${open}–${close} ${tz}`
}

export default async function TemplatesPage() {
    const admin = createAdminClient()
    const { data: templates } = await admin
        .from('poll_templates')
        .select('id, name, description, schedule, is_active, created_at')
        .order('created_at', { ascending: true })

    return (
        <main className="p-8 space-y-8 max-w-4xl">
            <header>
                <h1 className="text-2xl font-semibold">Poll templates</h1>
                <p className="text-sm text-neutral-500">
                    Each template is a recurring lunch poll. A template instantiates a fresh poll on each
                    scheduled day when it&apos;s active and has at least one restaurant assigned.
                </p>
            </header>

            <section className="space-y-3">
                <h2 className="text-lg font-medium">Create template</h2>
                <form action={createTemplate} className="flex gap-2 max-w-xl">
                    <input
                        name="name"
                        required
                        placeholder="e.g. Regular"
                        className="flex-1 border rounded-md px-3 py-2 bg-transparent"
                    />
                    <button
                        type="submit"
                        className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800"
                    >
                        Create
                    </button>
                </form>
                <p className="text-xs text-neutral-500">
                    New templates start inactive with a weekday 10:00–11:30 PT default schedule. Open the
                    template to configure and activate.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-medium">All templates ({templates?.length ?? 0})</h2>
                <div className="border rounded-md divide-y">
                    {templates?.map((t) => (
                        <Link
                            key={t.id}
                            href={`/admin/templates/${t.id}`}
                            className="p-4 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                        >
                            <div className="flex-1">
                                <div className="font-medium">{t.name}</div>
                                <div className="text-xs text-neutral-500">
                                    {t.description ?? '(no description)'}
                                </div>
                                <div className="text-xs text-neutral-500 mt-1">
                                    {describeSchedule((t.schedule ?? {}) as Schedule)}
                                </div>
                            </div>
                            <span
                                className={`text-xs rounded-full px-2 py-0.5 ${
                                    t.is_active
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                                        : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                                }`}
                            >
                                {t.is_active ? 'active' : 'paused'}
                            </span>
                        </Link>
                    ))}
                </div>
            </section>
        </main>
    )
}
