import type { Metadata } from 'next'
import { DocsPage } from '@/components/docs/DocsPage'
import { DocsPageHeader } from '@/components/docs/primitives'

export const metadata: Metadata = { title: 'One poll per day · Guide' }

export default function DailyLock() {
    return (
        <DocsPage>
            <DocsPageHeader
                eyebrow="Core mechanics"
                title="One poll per day"
                lead="You can vote in at most one template&rsquo;s poll per day. Here&rsquo;s why and how the lock works."
            />

            <p>
                The first poll you vote in (for a given scheduled date)
                locks you into that template for the day. If you visit a
                different template&rsquo;s poll on the same day, you&rsquo;ll
                see a message telling you which poll you&rsquo;re locked
                into.
            </p>
            <p>
                Unchecking all your boxes and saving doesn&rsquo;t release
                the lock &mdash; once you&rsquo;ve participated, you&rsquo;ve
                committed that day&rsquo;s participation slot to that
                template.
            </p>
            <p>
                In practice this rarely comes up: most offices run one
                template at a time. It matters if there are ever parallel
                templates (e.g. &ldquo;Lunch&rdquo; and &ldquo;Happy
                Hour&rdquo;) that overlap in time.
            </p>
        </DocsPage>
    )
}
