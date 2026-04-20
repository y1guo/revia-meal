import type { Metadata } from 'next'
import Link from 'next/link'
import { DocsPage } from '@/components/docs/DocsPage'
import { DocsPageHeader, FaqItem } from '@/components/docs/primitives'

export const metadata: Metadata = { title: 'FAQ · Guide' }

export default function Faq() {
    return (
        <DocsPage>
            <DocsPageHeader
                eyebrow="Reference"
                title="FAQ"
                lead="Answers to things that come up often."
            />

            <div className="space-y-2 mt-6">
                <FaqItem question="Where did my banked credit go? It was there yesterday.">
                    It probably got exercised. If that restaurant won
                    today&rsquo;s poll and you were voting for it, your
                    banked credit was consumed. Check the poll&rsquo;s
                    closed view &mdash; you&rsquo;ll see yourself in the
                    winning restaurant&rsquo;s voter list.
                </FaqItem>
                <FaqItem question="Why doesn&rsquo;t today have a poll?">
                    Either today&rsquo;s day-of-week isn&rsquo;t in any
                    active template&rsquo;s schedule, or an admin
                    explicitly cancelled today&rsquo;s poll. Ask an admin
                    to check the template&rsquo;s configuration.
                </FaqItem>
                <FaqItem question="Can I change my vote after I submit?">
                    Yes &mdash; as long as the poll is still open. Just
                    visit the poll page, adjust your picks, and save. You
                    can do this as many times as you want.
                </FaqItem>
                <FaqItem question="Why is my banked credit a fraction?">
                    Because when you originally voted for that restaurant,
                    you picked multiple restaurants on that ballot, so
                    your credit was split. That fractional vote is what
                    got banked.
                </FaqItem>
                <FaqItem question="Do banked credits expire?">
                    No. A banked credit stays until it&rsquo;s exercised
                    (see{' '}
                    <Link href="/docs/rolling-credits#exercising">
                        When credits get used up
                    </Link>
                    ). Credits that never get used up because the user
                    never gets the right combo of &ldquo;present + voting
                    for that restaurant + that restaurant winning&rdquo;
                    simply stay banked forever. In practice this is rare.
                </FaqItem>
                <FaqItem question="Can I see how many credits others have?">
                    No. Banked credits are always private to the person
                    who owns them. You can see other people&rsquo;s
                    today-votes post-close, but not their banked balances.
                </FaqItem>
                <FaqItem question="How are ties broken?">
                    Random pick among the tied restaurants. If Chipotle
                    and Sushi both end up with a total tally of 2, a coin
                    flip decides.
                </FaqItem>
                <FaqItem question="What happens if nobody votes?">
                    The poll auto-cancels with reason &ldquo;no
                    votes&rdquo;. No credits are exercised and no winner
                    is recorded.
                </FaqItem>
            </div>
        </DocsPage>
    )
}
