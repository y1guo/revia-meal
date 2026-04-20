import type { Metadata } from 'next'
import { DocsPage } from '@/components/docs/DocsPage'
import {
    DocsPageHeader,
    GlossaryItem,
} from '@/components/docs/primitives'

export const metadata: Metadata = { title: 'Glossary · Guide' }

export default function Glossary() {
    return (
        <DocsPage>
            <DocsPageHeader
                eyebrow="Reference"
                title="Glossary"
                lead="Terms used across the app and this guide."
            />

            <dl className="space-y-4">
                <GlossaryItem term="Ballot">
                    The list of restaurants on a specific poll,
                    snapshotted at the time the poll was created.
                </GlossaryItem>
                <GlossaryItem term="Banked credit">
                    A past vote that hasn&rsquo;t been consumed yet.
                    Attached to a specific (user, restaurant) pair.
                    Activates when that user votes for that restaurant in
                    a future poll and that restaurant wins.
                </GlossaryItem>
                <GlossaryItem term="Exercised">
                    A vote that has been consumed by a winning poll. No
                    longer contributes to any future tallies.
                </GlossaryItem>
                <GlossaryItem term="Finalized">
                    A poll that has been computed and has a recorded
                    winner.
                </GlossaryItem>
                <GlossaryItem term="Pick">
                    A single user&rsquo;s selection of one restaurant on a
                    ballot. You can have multiple picks per poll.
                </GlossaryItem>
                <GlossaryItem term="Poll">
                    One instance of a template for a specific date.
                    Templates instantiate polls.
                </GlossaryItem>
                <GlossaryItem term="Template">
                    A recurring poll definition &mdash; its schedule and
                    its set of restaurants. &ldquo;Lunch&rdquo; or
                    &ldquo;Happy Hour&rdquo; would be templates.
                </GlossaryItem>
                <GlossaryItem term="Vote weight">
                    <code>1 / number_of_picks</code>. Your total credit
                    for a poll is always 1, split evenly across everything
                    you picked.
                </GlossaryItem>
            </dl>
        </DocsPage>
    )
}
