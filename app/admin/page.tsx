import Link from 'next/link'

export default function AdminHome() {
    return (
        <main className="p-8 space-y-4 max-w-3xl">
            <header>
                <h1 className="text-2xl font-semibold">Admin</h1>
                <p className="text-sm text-neutral-500">
                    Manage the allowlist, the restaurant catalog, and poll templates.
                </p>
            </header>
            <ul className="space-y-2 text-sm">
                <li>
                    <Link href="/admin/users" className="text-blue-600 underline">
                        Users
                    </Link>{' '}
                    — email allowlist, roles, active/inactive.
                </li>
                <li>
                    <Link href="/admin/restaurants" className="text-blue-600 underline">
                        Restaurants
                    </Link>{' '}
                    — shared catalog. Add once, reuse across templates.
                </li>
                <li>
                    <Link href="/admin/templates" className="text-blue-600 underline">
                        Templates
                    </Link>{' '}
                    — recurring polls. Configure schedule + assigned restaurants per template.
                </li>
            </ul>
        </main>
    )
}
