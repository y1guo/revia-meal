import { createAdminClient } from '@/lib/supabase/admin'
import { addRestaurant, updateRestaurant } from './actions'

export default async function RestaurantsPage() {
    const admin = createAdminClient()
    const { data: restaurants } = await admin
        .from('restaurants')
        .select('id, name, doordash_url, notes, is_active, created_at')
        .order('created_at', { ascending: true })

    return (
        <main className="p-8 space-y-8 max-w-5xl">
            <header>
                <h1 className="text-2xl font-semibold">Restaurants</h1>
                <p className="text-sm text-neutral-500">
                    Shared catalog. Add once here, then assign to one or more templates separately.
                </p>
            </header>

            <section className="space-y-3">
                <h2 className="text-lg font-medium">Add restaurant</h2>
                <form action={addRestaurant} className="flex flex-wrap gap-2">
                    <input
                        name="name"
                        required
                        placeholder="name"
                        className="flex-1 min-w-[180px] border rounded-md px-3 py-2 bg-transparent"
                    />
                    <input
                        name="doordash_url"
                        type="url"
                        placeholder="doordash url (optional)"
                        className="flex-1 min-w-[260px] border rounded-md px-3 py-2 bg-transparent"
                    />
                    <input
                        name="notes"
                        placeholder="notes (optional)"
                        className="flex-1 min-w-[200px] border rounded-md px-3 py-2 bg-transparent"
                    />
                    <button
                        type="submit"
                        className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800"
                    >
                        Add
                    </button>
                </form>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-medium">Catalog ({restaurants?.length ?? 0})</h2>
                <div className="border rounded-md divide-y">
                    {restaurants?.map((r) => (
                        <form
                            key={r.id}
                            action={updateRestaurant}
                            className="p-4 flex flex-wrap items-center gap-2"
                        >
                            <input type="hidden" name="id" value={r.id} />
                            <input
                                name="name"
                                defaultValue={r.name}
                                required
                                className="flex-1 min-w-[160px] border rounded-md px-2 py-1 text-sm bg-transparent"
                            />
                            <input
                                name="doordash_url"
                                defaultValue={r.doordash_url ?? ''}
                                placeholder="doordash url"
                                className="flex-1 min-w-[220px] border rounded-md px-2 py-1 text-sm bg-transparent"
                            />
                            <input
                                name="notes"
                                defaultValue={r.notes ?? ''}
                                placeholder="notes"
                                className="flex-1 min-w-[160px] border rounded-md px-2 py-1 text-sm bg-transparent"
                            />
                            <label className="flex items-center gap-1 text-sm">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    defaultChecked={r.is_active}
                                />
                                active
                            </label>
                            <button
                                type="submit"
                                className="rounded-md border px-3 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
                            >
                                Save
                            </button>
                        </form>
                    ))}
                </div>
                <p className="text-xs text-neutral-500">
                    Removing a restaurant is done by unchecking <code>active</code> — banked credits
                    users hold for it in any template are preserved.
                </p>
            </section>
        </main>
    )
}
