import type { Metadata } from 'next'
import { PageHeader } from '@/components/shell/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { TextInput } from '@/components/ui/TextInput'
import { createAdminClient } from '@/lib/supabase/admin'
import { addRestaurant, updateRestaurant } from './actions'

export const metadata: Metadata = { title: 'Restaurants · Admin' }

export default async function RestaurantsPage() {
    const admin = createAdminClient()
    const { data: restaurants } = await admin
        .from('restaurants')
        .select('id, name, doordash_url, notes, is_active, created_at')
        .order('created_at', { ascending: true })

    return (
        <>
            <PageHeader
                title="Restaurants"
                subtitle="Shared catalog. Add once here, then assign to one or more templates separately."
            />

            <div className="space-y-6">
                <Card>
                    <h2 className="font-display font-medium text-[1rem] text-[color:var(--text-primary)] mb-3">
                        Add restaurant
                    </h2>
                    <form action={addRestaurant} className="grid gap-2 md:grid-cols-[2fr_3fr_3fr_auto]">
                        <TextInput
                            name="name"
                            required
                            placeholder="Name"
                        />
                        <TextInput
                            name="doordash_url"
                            type="url"
                            placeholder="DoorDash URL (optional)"
                        />
                        <TextInput
                            name="notes"
                            placeholder="Notes (optional)"
                        />
                        <Button type="submit" variant="primary">
                            Add
                        </Button>
                    </form>
                </Card>

                <h2 className="font-display font-medium text-[1rem] text-[color:var(--text-primary)]">
                    Catalog · {restaurants?.length ?? 0}{' '}
                    {restaurants?.length === 1 ? 'restaurant' : 'restaurants'}
                </h2>

                <ul className="space-y-3">
                    {restaurants?.map((r) => (
                        <li key={r.id}>
                            <Card>
                                <form
                                    action={updateRestaurant}
                                    className="grid gap-2 md:grid-cols-[2fr_3fr_3fr_auto_auto]"
                                >
                                    <input
                                        type="hidden"
                                        name="id"
                                        value={r.id}
                                    />
                                    <TextInput
                                        name="name"
                                        defaultValue={r.name}
                                        required
                                        size="sm"
                                    />
                                    <TextInput
                                        name="doordash_url"
                                        defaultValue={r.doordash_url ?? ''}
                                        placeholder="DoorDash URL"
                                        size="sm"
                                    />
                                    <TextInput
                                        name="notes"
                                        defaultValue={r.notes ?? ''}
                                        placeholder="Notes"
                                        size="sm"
                                    />
                                    <label className="inline-flex items-center gap-1.5 text-[0.8125rem]">
                                        <input
                                            type="checkbox"
                                            name="is_active"
                                            defaultChecked={r.is_active}
                                            className="h-4 w-4 accent-[color:var(--accent-brand)]"
                                        />
                                        Active
                                        {!r.is_active && (
                                            <Chip variant="neutral">
                                                inactive
                                            </Chip>
                                        )}
                                    </label>
                                    <Button type="submit" size="sm">
                                        Save
                                    </Button>
                                </form>
                            </Card>
                        </li>
                    ))}
                </ul>
                <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
                    Removing a restaurant is done by unchecking{' '}
                    <code className="font-mono bg-[color:var(--surface-sunken)] px-1 rounded">
                        Active
                    </code>{' '}
                    — banked credits users hold for it in any template are
                    preserved.
                </p>
            </div>
        </>
    )
}
