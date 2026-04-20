import type { Metadata } from 'next'
import Link from 'next/link'
import { DocsPage } from '@/components/docs/DocsPage'
import {
    CodeBlock,
    DocsPageHeader,
    SubSection,
} from '@/components/docs/primitives'
import { Callout } from '@/components/ui/Callout'

export const metadata: Metadata = { title: 'Voting & daily use · Guide' }

const TOC = [
    { id: 'voting', label: 'Voting in today\u2019s poll' },
    { id: 'results', label: 'Seeing the results' },
    { id: 'history', label: 'Browsing past polls' },
    { id: 'people', label: 'The People spectrum' },
]

export default function YourDay() {
    return (
        <DocsPage onThisPage={TOC}>
            <DocsPageHeader
                eyebrow="Getting started"
                title="Voting & daily use"
                lead="The four surfaces you&rsquo;ll touch most often during a normal lunch day."
            />

            <SubSection id="voting" title="Voting in today&rsquo;s poll">
                <p>
                    When you land on <Link href="/">the dashboard</Link>,
                    you see a card for each poll scheduled today. Click one
                    to open the poll.
                </p>
                <p>
                    If voting is open, you&rsquo;ll see a checklist of
                    restaurants. Check as many as sound good. Each checked
                    option gets <code>1 / N</code> of your credit, where N
                    is the number of boxes you&rsquo;ve checked. So if you
                    pick 2 restaurants, each gets 0.5. Pick 4, each gets
                    0.25.
                </p>
                <p>
                    You can freely add or remove picks and hit save as many
                    times as you want until the poll closes. Unchecking
                    everything and saving is the same as not voting (but
                    you&rsquo;re still locked into this poll&rsquo;s
                    template for the day &mdash; see{' '}
                    <Link href="/docs/daily-lock">One poll per day</Link>).
                </p>
                <p>
                    Next to each restaurant, if you have any{' '}
                    <strong>banked credits</strong> for it from past polls,
                    they&rsquo;re shown inline (e.g. &ldquo;+0.5
                    banked&rdquo;). Those credits only count if you
                    actually pick that restaurant today &mdash; checking
                    the box activates them.
                </p>
                <Callout tone="note" title="Why the tally is hidden">
                    The aggregate live tally is intentionally hidden while
                    voting is open. You see your own votes and your own
                    banked credits, but not how many votes each restaurant
                    has in total. This prevents everyone from piling on the
                    front-runner at the last minute.
                </Callout>
            </SubSection>

            <SubSection id="results" title="Seeing the results">
                <p>
                    When a poll closes, the page switches to a results
                    view. The winning restaurant is highlighted at the top.
                    Below, each restaurant shows a tally line:
                </p>
                <CodeBlock>
                    today <em>N</em> + banked <em>M</em> = total <em>T</em>
                </CodeBlock>
                <ul>
                    <li>
                        <strong>today</strong>: the sum of everyone&rsquo;s
                        picks for this restaurant in today&rsquo;s poll.
                    </li>
                    <li>
                        <strong>banked</strong>: the boost from banked
                        credits held by people who voted for this
                        restaurant today.
                    </li>
                    <li>
                        <strong>total</strong>: the number that actually
                        determines the winner.
                    </li>
                </ul>
                <p>
                    Each restaurant also shows who voted for it and how
                    much each vote counted for. Vote weights are visible
                    publicly post-close, but banked balances are always
                    private to the person who owns them.
                </p>
            </SubSection>

            <SubSection id="history" title="Browsing past polls">
                <p>
                    <Link href="/history">The History page</Link> lists
                    polls that have concluded (closed or cancelled). You
                    can filter by template, date range, status, winner, and
                    participant. Click any row to see the full breakdown
                    for that poll.
                </p>
            </SubSection>

            <SubSection id="people" title="The People spectrum">
                <p>
                    <Link href="/people">The People page</Link> shows each
                    person&rsquo;s restaurant preferences aggregated over a
                    date range. Longer bars next to a restaurant mean more
                    vote weight from that person over the chosen window.
                </p>
                <p>
                    Useful for spotting patterns (&ldquo;Claire is really
                    into Sushi&rdquo;) and for checking whether the
                    rolling-credit system has been fair to you.
                </p>
            </SubSection>
        </DocsPage>
    )
}
