import Link from 'next/link'
import { PageHeader } from '@/components/shell/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { TextInput } from '@/components/ui/TextInput'
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
    const days =
        (s.days_of_week ?? []).map((n) => DAY_LABELS[n] ?? '?').join(', ') ||
        'no days'
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
        <>
            <PageHeader
                title="Templates"
                subtitle="Each template is a recurring lunch poll. A template instantiates a fresh poll on each scheduled day when it's active and has at least one restaurant assigned."
            />

            <div className="space-y-6">
                <Card>
                    <h2 className="font-display font-medium text-[1rem] text-[color:var(--text-primary)] mb-3">
                        Create template
                    </h2>
                    <form action={createTemplate} className="space-y-2">
                        <div className="flex gap-2 max-w-[420px]">
                            <TextInput
                                name="name"
                                required
                                placeholder="e.g. Regular"
                                className="flex-1"
                            />
                            <Button type="submit" variant="primary">
                                Create
                            </Button>
                        </div>
                        <p className="text-[0.75rem] text-[color:var(--text-secondary)]">
                            New templates start inactive with a weekday
                            10:00–11:30 PT default schedule. Open the template
                            to configure and activate.
                        </p>
                    </form>
                </Card>

                <h2 className="font-display font-medium text-[1rem] text-[color:var(--text-primary)]">
                    All templates · {templates?.length ?? 0}
                </h2>

                <ul className="space-y-3">
                    {templates?.map((t) => (
                        <li key={t.id}>
                            <Link
                                href={`/admin/templates/${t.id}`}
                                className="block"
                            >
                                <Card
                                    interactive
                                    className="flex items-center gap-3"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-[color:var(--text-primary)]">
                                            {t.name}
                                        </div>
                                        <div className="text-[0.8125rem] text-[color:var(--text-secondary)]">
                                            {t.description ?? '(no description)'}
                                        </div>
                                        <div className="text-[0.75rem] font-mono tabular-nums text-[color:var(--text-tertiary)] mt-1">
                                            {describeSchedule(
                                                (t.schedule ?? {}) as Schedule,
                                            )}
                                        </div>
                                    </div>
                                    <Chip
                                        variant={
                                            t.is_active ? 'success' : 'neutral'
                                        }
                                    >
                                        {t.is_active ? 'active' : 'paused'}
                                    </Chip>
                                </Card>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </>
    )
}
