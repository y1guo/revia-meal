import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shell/PageHeader'
import { BackLink } from '@/components/ui/BackLink'
import { Card } from '@/components/ui/Card'
import { decodePrefill } from '@/lib/rich-content'
import { ImportForm } from './import-form'

type SearchParams = Promise<{ prefill?: string }>

export const metadata: Metadata = { title: 'Import from DoorDash · Admin' }

export default async function NewRestaurantPage({
    searchParams,
}: {
    searchParams: SearchParams
}) {
    const { prefill } = await searchParams

    if (!prefill) {
        // This page is specifically for bookmarklet-prefilled imports. Manual
        // adds use the `AddRestaurantModal` on /admin/restaurants.
        redirect('/admin/restaurants')
    }

    const decoded = decodePrefill(prefill)
    if (!decoded) {
        return (
            <>
                <BackLink href="/admin/restaurants">All restaurants</BackLink>
                <PageHeader
                    title="Couldn't import"
                    subtitle="The prefill data was missing or invalid."
                />
                <Card>
                    <p className="text-[0.875rem] text-[color:var(--text-primary)]">
                        Re-run the bookmarklet from the DoorDash page, or add
                        this restaurant manually from the{' '}
                        <Link
                            href="/admin/restaurants"
                            className="text-[color:var(--link-fg)] underline underline-offset-2"
                        >
                            restaurants list
                        </Link>
                        .
                    </p>
                </Card>
            </>
        )
    }

    return (
        <>
            <BackLink href="/admin/restaurants">All restaurants</BackLink>
            <PageHeader
                title="Import from DoorDash"
                subtitle="Review, tweak, and save."
            />
            <ImportForm decoded={decoded} prefill={prefill} />
        </>
    )
}
