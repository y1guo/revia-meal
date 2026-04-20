import type { Metadata } from 'next'
import { DocsPage } from '@/components/docs/DocsPage'
import {
    DocsPageHeader,
    SubSection,
} from '@/components/docs/primitives'
import { Callout } from '@/components/ui/Callout'

export const metadata: Metadata = { title: 'Rolling credits · Guide' }

const TOC = [
    { id: 'what-are-banked-credits', label: 'What a banked credit is' },
    { id: 'exercising', label: 'When credits get used up' },
    {
        id: 'why-my-pick-lost',
        label: 'Why my pick lost with the most votes',
    },
    { id: 'worked-example', label: 'A worked example' },
]

export default function RollingCredits() {
    return (
        <DocsPage onThisPage={TOC}>
            <DocsPageHeader
                eyebrow="Core mechanics"
                title="Rolling credits"
                lead="The mechanism that makes HeyRevia Meal different from a plain show-of-hands poll. If you only ever read one section of this guide, read this one."
            />

            <SubSection
                id="what-are-banked-credits"
                title="What a banked credit is"
            >
                <p>
                    Every vote you cast is kept as a ledger entry. If the
                    restaurant you voted for doesn&rsquo;t win that day,
                    the vote becomes a <strong>banked credit</strong> for
                    the specific pair{' '}
                    <code>(you, that restaurant)</code>.
                </p>
                <p>
                    Banked credits are tracked per-user, per-restaurant.
                    Your 0.5 banked credit for Chipotle is yours, and it
                    only applies to Chipotle. Nobody else
                    &ldquo;inherits&rdquo; your unused credits.
                </p>
            </SubSection>

            <SubSection id="exercising" title="When credits get used up">
                <p>
                    A banked credit <strong>exercises</strong> (turns into
                    &ldquo;past history, no longer usable&rdquo;) when all
                    three of these happen in the same poll:
                </p>
                <ol>
                    <li>The restaurant wins that poll.</li>
                    <li>You&rsquo;re present and vote in that poll.</li>
                    <li>You vote for that restaurant.</li>
                </ol>
                <p>
                    If any of these are missing, your banked credit stays
                    banked. A restaurant winning on a day you weren&rsquo;t
                    around does <em>not</em> consume your credit for it
                    &mdash; your credit will still be waiting the next
                    time you show up and vote for it.
                </p>
                <Callout tone="tip">
                    This is deliberate. It prevents &ldquo;wrong
                    audience&rdquo; outcomes where a restaurant wins on a
                    day the people who wanted it aren&rsquo;t there.
                </Callout>
            </SubSection>

            <SubSection
                id="why-my-pick-lost"
                title="Why my pick lost with the most votes today"
            >
                <p>
                    This is the single most common confusion. The winner
                    isn&rsquo;t decided by who got the most today-votes.
                    It&rsquo;s decided by <strong>total tally</strong>,
                    which is today-votes + banked-boost.
                </p>
                <p>
                    So if another restaurant had fewer today-votes but its
                    voters had banked credits for it, it can win.
                    That&rsquo;s the point of the system &mdash; if you
                    kept losing in the past, you eventually don&rsquo;t
                    have to.
                </p>
                <p>
                    Ties on the total tally are broken by a random pick
                    among the tied restaurants.
                </p>
            </SubSection>

            <SubSection id="worked-example" title="A worked example">
                <p>
                    Three coworkers, two restaurants (Chipotle and Sushi),
                    over two days.
                </p>
                <p>
                    <strong>
                        Day 1 &mdash; Alice, Bob vote Chipotle; Claire
                        votes Sushi.
                    </strong>
                </p>
                <ul>
                    <li>Chipotle: today 2, banked 0, total 2</li>
                    <li>Sushi: today 1, banked 0, total 1</li>
                </ul>
                <p>
                    Chipotle wins. Alice&rsquo;s and Bob&rsquo;s Chipotle
                    votes are exercised (consumed). Claire&rsquo;s Sushi
                    vote <em>stays banked</em> for the pair (Claire,
                    Sushi).
                </p>
                <p>
                    <strong>
                        Day 2 &mdash; Alice votes Chipotle; Bob
                        doesn&rsquo;t vote; Claire votes Sushi.
                    </strong>
                </p>
                <ul>
                    <li>
                        Chipotle: today 1 (Alice), banked 0 (Alice had no
                        banked Chipotle &mdash; hers were exercised
                        yesterday), total 1.
                    </li>
                    <li>
                        Sushi: today 1 (Claire), banked 1 (Claire&rsquo;s
                        banked credit from Day 1 counts because she&rsquo;s
                        voting Sushi today), total 2.
                    </li>
                </ul>
                <p>
                    <strong>Sushi wins</strong> &mdash; even though
                    today&rsquo;s votes were tied 1&ndash;1, and Chipotle
                    had way more votes yesterday. Claire &ldquo;cashed
                    in&rdquo; yesterday&rsquo;s patience.
                </p>
                <p>
                    Now Claire&rsquo;s today-Sushi vote <em>and</em> her
                    yesterday-banked Sushi vote both get exercised.
                    She&rsquo;s back to zero banked Sushi.
                </p>
            </SubSection>
        </DocsPage>
    )
}
