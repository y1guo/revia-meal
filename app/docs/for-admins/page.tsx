import type { Metadata } from 'next'
import Link from 'next/link'
import { DocsPage } from '@/components/docs/DocsPage'
import {
    DocsPageHeader,
    SubSection,
} from '@/components/docs/primitives'

export const metadata: Metadata = { title: 'Admin surfaces · Guide' }

const TOC = [
    { id: 'allowlist', label: 'The allowlist' },
    { id: 'restaurants', label: 'Restaurants' },
    { id: 'templates', label: 'Templates' },
    { id: 'admin-polls', label: 'Cancelling polls' },
]

export default function ForAdmins() {
    return (
        <DocsPage onThisPage={TOC}>
            <DocsPageHeader
                eyebrow="For admins"
                title="Admin surfaces"
                lead="Everyone can read this; only admins can act on it."
            />

            <SubSection id="allowlist" title="The allowlist">
                <p>
                    <Link href="/admin/users">/admin/users</Link> is the
                    list of email addresses allowed to sign in. People not
                    on this list cannot create an account even if they
                    have a Google Workspace email.
                </p>
                <p>
                    Each row exposes role (user / admin), active (can log
                    in right now), and display name. You can&rsquo;t
                    demote or deactivate yourself &mdash; promote someone
                    else to admin first if you need to.
                </p>
                <p>
                    Deleting a user is a hard delete: their votes,
                    daily-participation records, and API keys are
                    cascade-deleted. Poll-cancellation attribution
                    (<code>polls.cancelled_by</code>) is cleared but the
                    polls themselves survive.
                </p>
            </SubSection>

            <SubSection id="restaurants" title="Restaurants">
                <p>
                    <Link href="/admin/restaurants">/admin/restaurants</Link>{' '}
                    is the shared catalog. Each restaurant has a name, an
                    optional DoorDash URL, optional notes, and an active
                    flag. Inactive restaurants still exist in the DB (for
                    historical polls) but don&rsquo;t appear on new polls.
                </p>
                <p>
                    Restaurants are assigned to templates &mdash; a
                    restaurant has to be in at least one template before
                    it appears on any ballot.
                </p>
            </SubSection>

            <SubSection id="templates" title="Templates">
                <p>
                    A template is a recurring poll definition &mdash; its
                    schedule (days of week, open time, close time,
                    timezone) and its assigned restaurants.{' '}
                    <Link href="/admin/templates">/admin/templates</Link>{' '}
                    is where you configure them.
                </p>
                <p>
                    When a template is active and today is a scheduled
                    day, visiting the dashboard lazily instantiates
                    today&rsquo;s poll. No background cron is required.
                </p>
            </SubSection>

            <SubSection id="admin-polls" title="Cancelling polls">
                <p>
                    <Link href="/admin/polls">/admin/polls</Link> lists
                    every poll instance (past, today, future). You can
                    cancel any poll that isn&rsquo;t already cancelled
                    &mdash; scheduled, open, or even closed.
                </p>
                <p>
                    Cancelling a <em>closed</em> poll un-exercises any
                    credits it consumed, so the affected voters&rsquo;
                    banked balances come back. Participation locks for
                    that day + template are released, so those users can
                    participate in a replacement poll if you re-instantiate
                    one.
                </p>
                <p>
                    Cancelled polls are preserved in the DB (you can still
                    open their page and see what was on the ballot), but
                    they no longer contribute to any credit totals.
                </p>
            </SubSection>
        </DocsPage>
    )
}
