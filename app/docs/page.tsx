import Link from 'next/link'
import { signOut } from '@/app/actions'
import { AppShell } from '@/components/shell/AppShell'
import { PageHeader } from '@/components/shell/PageHeader'
import { cn } from '@/lib/cn'
import { requireUser } from '@/lib/auth'

type TocItem = { id: string; label: string; children?: TocItem[] }

const TOC: TocItem[] = [
    { id: 'overview', label: 'How this works in 60 seconds' },
    {
        id: 'your-day',
        label: 'Your day-to-day',
        children: [
            { id: 'voting', label: 'Voting in today\u2019s poll' },
            { id: 'results', label: 'Seeing the results' },
            { id: 'history', label: 'Browsing past polls' },
            { id: 'people', label: 'The People spectrum' },
        ],
    },
    {
        id: 'rolling-credits',
        label: 'Rolling credits',
        children: [
            { id: 'what-are-banked-credits', label: 'What a banked credit is' },
            { id: 'exercising', label: 'When credits get used up' },
            { id: 'why-my-pick-lost', label: 'Why my pick lost with the most votes today' },
            { id: 'worked-example', label: 'A worked example' },
        ],
    },
    { id: 'daily-lock', label: 'One poll per day' },
    {
        id: 'api-keys',
        label: 'API keys',
        children: [
            { id: 'generating-a-key', label: 'Generating a key' },
            { id: 'what-a-key-can-do', label: 'What a key can do' },
            { id: 'security-notes', label: 'Security notes' },
        ],
    },
    {
        id: 'for-admins',
        label: 'For admins',
        children: [
            { id: 'allowlist', label: 'The allowlist' },
            { id: 'restaurants', label: 'Restaurants' },
            { id: 'templates', label: 'Templates' },
            { id: 'admin-polls', label: 'Cancelling polls' },
        ],
    },
    { id: 'glossary', label: 'Glossary' },
    { id: 'faq', label: 'FAQ' },
]

function Toc({ items, depth = 0 }: { items: TocItem[]; depth?: number }) {
    return (
        <ul
            className={cn(
                'space-y-1',
                depth === 0
                    ? 'text-[0.875rem]'
                    : 'ml-3 mt-1 text-[0.8125rem] text-[color:var(--text-secondary)]',
            )}
        >
            {items.map((item) => (
                <li key={item.id}>
                    <a
                        href={`#${item.id}`}
                        className="text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors duration-150"
                    >
                        {item.label}
                    </a>
                    {item.children && (
                        <Toc items={item.children} depth={depth + 1} />
                    )}
                </li>
            ))}
        </ul>
    )
}

export default async function DocsPage() {
    const user = await requireUser()

    return (
        <AppShell
            user={user}
            signOutAction={signOut}
            maxWidthClassName="max-w-[1100px]"
        >
            <PageHeader
                title="Guide"
                subtitle="How revia-meal works, what banked credits are, and everything else you might want to know."
            />

            <div className="flex gap-10">
                <aside className="hidden lg:block w-60 shrink-0 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
                    <nav aria-label="Table of contents">
                        <p className="text-[0.6875rem] font-medium text-[color:var(--text-tertiary)] mb-3 uppercase tracking-wider">
                            Contents
                        </p>
                        <Toc items={TOC} />
                    </nav>
                </aside>

                <article className="docs-prose flex-1 max-w-[720px] space-y-12">
                    <Section id="overview" title="How this works in 60 seconds">
                        <p>
                            revia-meal is an internal lunch-poll app. Every weekday
                            morning a poll opens with a short list of restaurants.
                            You vote for whichever ones sound good. At the close
                            time, the app picks a winner, and someone places the
                            group order based on that winner.
                        </p>
                        <p>
                            The interesting part is what happens when your pick
                            loses: your vote gets remembered as a{' '}
                            <strong>banked credit</strong> for that restaurant, and
                            boosts that restaurant in future polls you vote on.
                            Over time, people who keep losing still get their
                            turn. See <a href="#rolling-credits" className="underline">Rolling credits</a> for the details.
                        </p>
                    </Section>

                    <Section id="your-day" title="Your day-to-day">
                        <SubSection id="voting" title="Voting in today&rsquo;s poll">
                            <p>
                                When you land on <Link href="/" className="underline">the dashboard</Link>, you see a card
                                for each poll scheduled today. Click one to open
                                the poll.
                            </p>
                            <p>
                                If voting is open, you&rsquo;ll see a checklist of
                                restaurants. Check as many as sound good. Each
                                checked option gets <code>1 / N</code> of your
                                credit, where N is the number of boxes you&rsquo;ve
                                checked. So if you pick 2 restaurants, each gets
                                0.5. Pick 4, each gets 0.25.
                            </p>
                            <p>
                                You can freely add or remove picks and hit save as
                                many times as you want until the poll closes.
                                Unchecking everything and saving is the same as
                                not voting (but you&rsquo;re still locked into this
                                poll&rsquo;s template for the day &mdash; see{' '}
                                <a href="#daily-lock" className="underline">One poll per day</a>).
                            </p>
                            <p>
                                Next to each restaurant, if you have any{' '}
                                <strong>banked credits</strong>{' '}for it from
                                past polls, they&rsquo;re shown inline
                                (e.g. &ldquo;+0.5 banked&rdquo;). Those credits
                                only count if you actually pick that restaurant
                                today &mdash; checking the box activates them.
                            </p>
                            <p>
                                The aggregate live tally is intentionally hidden
                                while voting is open. You see your own votes and
                                your own banked credits, but not how many votes
                                each restaurant has in total. This is deliberate:
                                it prevents everyone from piling on the
                                front-runner at the last minute.
                            </p>
                        </SubSection>

                        <SubSection id="results" title="Seeing the results">
                            <p>
                                When a poll closes, the page switches to a results
                                view. The winning restaurant is highlighted at the
                                top. Below, each restaurant shows a tally line:
                            </p>
                            <pre className="text-xs bg-neutral-100 dark:bg-neutral-900 rounded-md p-3 overflow-x-auto">
                                today <em>N</em> + banked <em>M</em> = total <em>T</em>
                            </pre>
                            <ul>
                                <li>
                                    <strong>today</strong>: the sum of everyone&rsquo;s picks for this restaurant in today&rsquo;s poll.
                                </li>
                                <li>
                                    <strong>banked</strong>: the boost from banked credits held by people who voted for this restaurant today.
                                </li>
                                <li>
                                    <strong>total</strong>: the number that actually determines the winner.
                                </li>
                            </ul>
                            <p>
                                Each restaurant also shows who voted for it and
                                how much each vote counted for. Vote weights are
                                visible publicly post-close, but banked balances
                                are always private to the person who owns them.
                            </p>
                        </SubSection>

                        <SubSection id="history" title="Browsing past polls">
                            <p>
                                <Link href="/history" className="underline">The History page</Link> lists
                                polls that have concluded (closed or cancelled).
                                You can filter by template, date range, status,
                                winner, and participant. Click any row to see the
                                full breakdown for that poll.
                            </p>
                        </SubSection>

                        <SubSection id="people" title="The People spectrum">
                            <p>
                                <Link href="/people" className="underline">The People page</Link> shows
                                each person&rsquo;s restaurant preferences
                                aggregated over a date range. Longer bars next to
                                a restaurant mean more vote weight from that
                                person over the chosen window.
                            </p>
                            <p>
                                Useful for spotting patterns (&ldquo;Claire is
                                really into Sushi&rdquo;) and for checking whether
                                the rolling-credit system has been fair to you.
                            </p>
                        </SubSection>
                    </Section>

                    <Section
                        id="rolling-credits"
                        title="Rolling credits (the interesting part)"
                    >
                        <p>
                            This is the mechanism that makes revia-meal different
                            from a plain show-of-hands poll. If you only ever
                            read one section of this guide, read this one.
                        </p>

                        <SubSection
                            id="what-are-banked-credits"
                            title="What a banked credit is"
                        >
                            <p>
                                Every vote you cast is kept as a ledger entry. If
                                the restaurant you voted for doesn&rsquo;t win
                                that day, the vote becomes a{' '}
                                <strong>banked credit</strong> for the specific
                                pair <code>(you, that restaurant)</code>.
                            </p>
                            <p>
                                Banked credits are tracked per-user, per-restaurant.
                                Your 0.5 banked credit for Chipotle is yours, and
                                it only applies to Chipotle. Nobody else
                                &ldquo;inherits&rdquo; your unused credits.
                            </p>
                        </SubSection>

                        <SubSection id="exercising" title="When credits get used up">
                            <p>
                                A banked credit <strong>exercises</strong> (turns
                                into &ldquo;past history, no longer usable&rdquo;)
                                when all three of these happen in the same poll:
                            </p>
                            <ol>
                                <li>The restaurant wins that poll.</li>
                                <li>You&rsquo;re present and vote in that poll.</li>
                                <li>You vote for that restaurant.</li>
                            </ol>
                            <p>
                                If any of these are missing, your banked credit
                                stays banked. A restaurant winning on a day you
                                weren&rsquo;t around does <em>not</em> consume
                                your credit for it &mdash; your credit will still
                                be waiting the next time you show up and vote for
                                it.
                            </p>
                            <p>
                                This is deliberate. It prevents &ldquo;wrong
                                audience&rdquo; outcomes where a restaurant wins
                                on a day the people who wanted it aren&rsquo;t
                                there.
                            </p>
                        </SubSection>

                        <SubSection
                            id="why-my-pick-lost"
                            title="Why my pick lost with the most votes today"
                        >
                            <p>
                                This is the single most common confusion. The
                                winner isn&rsquo;t decided by who got the most
                                today-votes. It&rsquo;s decided by{' '}
                                <strong>total tally</strong>, which is today-votes
                                + banked-boost.
                            </p>
                            <p>
                                So if another restaurant had fewer today-votes but
                                its voters had banked credits for it, it can win.
                                That&rsquo;s the point of the system &mdash; if
                                you kept losing in the past, you eventually
                                don&rsquo;t have to.
                            </p>
                            <p>
                                Ties on the total tally are broken by a random
                                pick among the tied restaurants.
                            </p>
                        </SubSection>

                        <SubSection
                            id="worked-example"
                            title="A worked example"
                        >
                            <p>
                                Three coworkers, two restaurants (Chipotle and
                                Sushi), over two days.
                            </p>
                            <p>
                                <strong>Day 1 &mdash; Alice, Bob vote Chipotle; Claire votes Sushi.</strong>
                            </p>
                            <ul>
                                <li>Chipotle: today 2, banked 0, total 2</li>
                                <li>Sushi: today 1, banked 0, total 1</li>
                            </ul>
                            <p>
                                Chipotle wins. Alice&rsquo;s and Bob&rsquo;s
                                Chipotle votes are exercised (consumed).
                                Claire&rsquo;s Sushi vote <em>stays banked</em>{' '}
                                for the pair (Claire, Sushi).
                            </p>
                            <p>
                                <strong>Day 2 &mdash; Alice votes Chipotle; Bob doesn&rsquo;t vote; Claire votes Sushi.</strong>
                            </p>
                            <ul>
                                <li>
                                    Chipotle: today 1 (Alice), banked 0 (Alice
                                    had no banked Chipotle &mdash; hers were
                                    exercised yesterday), total 1.
                                </li>
                                <li>
                                    Sushi: today 1 (Claire), banked 1
                                    (Claire&rsquo;s banked credit from Day 1
                                    counts because she&rsquo;s voting Sushi
                                    today), total 2.
                                </li>
                            </ul>
                            <p>
                                <strong>Sushi wins</strong> &mdash; even though
                                today&rsquo;s votes were tied 1&ndash;1, and
                                Chipotle had way more votes yesterday. Claire
                                &ldquo;cashed in&rdquo; yesterday&rsquo;s
                                patience.
                            </p>
                            <p>
                                Now Claire&rsquo;s today-Sushi vote <em>and</em>{' '}
                                her yesterday-banked Sushi vote both get
                                exercised. She&rsquo;s back to zero banked Sushi.
                            </p>
                        </SubSection>
                    </Section>

                    <Section id="daily-lock" title="One poll per day">
                        <p>
                            You can vote in at most one template&rsquo;s poll per
                            day. The first poll you vote in (for a given
                            scheduled date) locks you into that template for the
                            day. If you visit a different template&rsquo;s poll
                            on the same day, you&rsquo;ll see a message telling
                            you which poll you&rsquo;re locked into.
                        </p>
                        <p>
                            Unchecking all your boxes and saving doesn&rsquo;t
                            release the lock &mdash; once you&rsquo;ve
                            participated, you&rsquo;ve committed that day&rsquo;s
                            participation slot to that template.
                        </p>
                        <p>
                            In practice this rarely comes up: most offices run
                            one template at a time. It matters if there are ever
                            parallel templates (e.g. &ldquo;Lunch&rdquo; and
                            &ldquo;Happy Hour&rdquo;) that overlap in time.
                        </p>
                    </Section>

                    <Section id="api-keys" title="API keys">
                        <p>
                            API keys let you authenticate programmatic requests
                            to revia-meal&rsquo;s API. They&rsquo;re for the
                            future Slack cron integration, one-off scripts, and
                            whatever you want to build on top.
                        </p>

                        <SubSection id="generating-a-key" title="Generating a key">
                            <p>
                                Go to <Link href="/settings" className="underline">Settings</Link>,
                                name your key, and click Create. You&rsquo;ll see
                                the plaintext token <em>exactly once</em> &mdash;
                                copy it immediately into whatever will use it.
                                After that, only a hash is stored; we cannot
                                retrieve the plaintext for you.
                            </p>
                            <p>
                                If you lose the plaintext, revoke the key and
                                create a new one.
                            </p>
                        </SubSection>

                        <SubSection
                            id="what-a-key-can-do"
                            title="What a key can do"
                        >
                            <p>
                                An API key inherits <strong>your current role</strong>.
                                If you&rsquo;re a regular user, your key can call
                                anything a regular user can do. If you&rsquo;re
                                an admin, your key can call admin endpoints.
                            </p>
                            <p>
                                If your role changes (e.g. you&rsquo;re promoted
                                to admin), existing keys pick up the new role
                                automatically. If you&rsquo;re deactivated, your
                                keys stop working on the next call.
                            </p>
                            <p>Use the key by sending it in the Authorization header:</p>
                            <pre className="text-xs bg-neutral-100 dark:bg-neutral-900 rounded-md p-3 overflow-x-auto">
                                Authorization: Bearer rk_your_key_here
                            </pre>
                            <p>Currently exposed endpoints:</p>
                            <ul>
                                <li>
                                    <code>GET /api/v1/polls/today</code> &mdash;
                                    today&rsquo;s polls across all active
                                    templates.
                                </li>
                                <li>
                                    <code>GET /api/v1/polls/:id/results</code>{' '}
                                    &mdash; a specific poll&rsquo;s ballot,
                                    tallies (for concluded polls), and voter
                                    list.
                                </li>
                            </ul>
                        </SubSection>

                        <SubSection id="security-notes" title="Security notes">
                            <ul>
                                <li>
                                    Treat the plaintext like a password. Anyone
                                    who has it can act as you.
                                </li>
                                <li>
                                    Never check keys into git or paste them into
                                    shared docs. Use environment variables or a
                                    secret manager.
                                </li>
                                <li>
                                    Revoke unused or suspicious keys. Revocation
                                    is immediate and permanent; the key cannot be
                                    restored.
                                </li>
                                <li>
                                    The <em>Last used</em> timestamp on the
                                    settings page tells you whether a key is
                                    still actively being used.
                                </li>
                            </ul>
                        </SubSection>
                    </Section>

                    <Section id="for-admins" title="For admins">
                        <p>
                            This section documents admin-only surfaces. Everyone
                            can read it; only admins can act on it.
                        </p>

                        <SubSection id="allowlist" title="The allowlist">
                            <p>
                                <Link href="/admin/users" className="underline">
                                    /admin/users
                                </Link>{' '}
                                is the list of email addresses allowed to sign in.
                                People not on this list cannot create an account
                                even if they have a Google Workspace email.
                            </p>
                            <p>
                                Each row exposes role (user / admin), active
                                (can log in right now), and display name. You
                                can&rsquo;t demote or deactivate yourself &mdash;
                                promote someone else to admin first if you
                                need to.
                            </p>
                            <p>
                                Deleting a user is a hard delete: their votes,
                                daily-participation records, and API keys are
                                cascade-deleted. Poll-cancellation attribution
                                (<code>polls.cancelled_by</code>) is cleared but
                                the polls themselves survive.
                            </p>
                        </SubSection>

                        <SubSection id="restaurants" title="Restaurants">
                            <p>
                                <Link href="/admin/restaurants" className="underline">
                                    /admin/restaurants
                                </Link>{' '}
                                is the shared catalog. Each restaurant has a
                                name, an optional DoorDash URL, optional notes,
                                and an active flag. Inactive restaurants still
                                exist in the DB (for historical polls) but
                                don&rsquo;t appear on new polls.
                            </p>
                            <p>
                                Restaurants are assigned to templates &mdash; a
                                restaurant has to be in at least one template
                                before it appears on any ballot.
                            </p>
                        </SubSection>

                        <SubSection id="templates" title="Templates">
                            <p>
                                A template is a recurring poll definition &mdash;
                                its schedule (days of week, open time, close
                                time, timezone) and its assigned restaurants.
                                <Link
                                    href="/admin/templates"
                                    className="underline"
                                >
                                    {' '}/admin/templates{' '}
                                </Link>
                                is where you configure them.
                            </p>
                            <p>
                                When a template is active and today is a
                                scheduled day, visiting the dashboard
                                lazily instantiates today&rsquo;s poll. No
                                background cron is required.
                            </p>
                        </SubSection>

                        <SubSection id="admin-polls" title="Cancelling polls">
                            <p>
                                <Link href="/admin/polls" className="underline">
                                    /admin/polls
                                </Link>{' '}
                                lists every poll instance (past, today, future).
                                You can cancel any poll that isn&rsquo;t already
                                cancelled &mdash; scheduled, open, or even
                                closed.
                            </p>
                            <p>
                                Cancelling a <em>closed</em> poll un-exercises
                                any credits it consumed, so the affected
                                voters&rsquo; banked balances come back.
                                Participation locks for that day + template are
                                released, so those users can participate in a
                                replacement poll if you re-instantiate one.
                            </p>
                            <p>
                                Cancelled polls are preserved in the DB (you can
                                still open their page and see what was on the
                                ballot), but they no longer contribute to any
                                credit totals.
                            </p>
                        </SubSection>
                    </Section>

                    <Section id="glossary" title="Glossary">
                        <dl className="space-y-3">
                            <GlossaryItem term="Ballot">
                                The list of restaurants on a specific poll,
                                snapshotted at the time the poll was created.
                            </GlossaryItem>
                            <GlossaryItem term="Banked credit">
                                A past vote that hasn&rsquo;t been consumed yet.
                                Attached to a specific (user, restaurant) pair.
                                Activates when that user votes for that
                                restaurant in a future poll and that restaurant
                                wins.
                            </GlossaryItem>
                            <GlossaryItem term="Exercised">
                                A vote that has been consumed by a winning poll.
                                No longer contributes to any future tallies.
                            </GlossaryItem>
                            <GlossaryItem term="Finalized">
                                A poll that has been computed and has a
                                recorded winner.
                            </GlossaryItem>
                            <GlossaryItem term="Pick">
                                A single user&rsquo;s selection of one restaurant
                                on a ballot. You can have multiple picks per
                                poll.
                            </GlossaryItem>
                            <GlossaryItem term="Poll">
                                One instance of a template for a specific date.
                                Templates instantiate polls.
                            </GlossaryItem>
                            <GlossaryItem term="Template">
                                A recurring poll definition &mdash; its schedule
                                and its set of restaurants. &ldquo;Lunch&rdquo;
                                or &ldquo;Happy Hour&rdquo; would be templates.
                            </GlossaryItem>
                            <GlossaryItem term="Vote weight">
                                <code>1 / number_of_picks</code>. Your total
                                credit for a poll is always 1, split evenly
                                across everything you picked.
                            </GlossaryItem>
                        </dl>
                    </Section>

                    <Section id="faq" title="FAQ">
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
                            visit the poll page, adjust your picks, and save.
                            You can do this as many times as you want.
                        </FaqItem>
                        <FaqItem question="Why is my banked credit a fraction?">
                            Because when you originally voted for that
                            restaurant, you picked multiple restaurants on that
                            ballot, so your credit was split. That fractional
                            vote is what got banked.
                        </FaqItem>
                        <FaqItem question="Do banked credits expire?">
                            No. A banked credit stays until it&rsquo;s
                            exercised (see <a href="#exercising" className="underline">When credits get used up</a>).
                            Credits that never get used up because the user
                            never gets the right combo of &ldquo;present +
                            voting for that restaurant + that restaurant
                            winning&rdquo; simply stay banked forever. In
                            practice this is rare.
                        </FaqItem>
                        <FaqItem question="Can I see how many credits others have?">
                            No. Banked credits are always private to the person
                            who owns them. You can see other people&rsquo;s
                            today-votes post-close, but not their banked
                            balances.
                        </FaqItem>
                        <FaqItem question="How are ties broken?">
                            Random pick among the tied restaurants. If Chipotle
                            and Sushi both end up with a total tally of 2, a
                            coin flip decides.
                        </FaqItem>
                        <FaqItem question="What happens if nobody votes?">
                            The poll auto-cancels with reason &ldquo;no
                            votes&rdquo;. No credits are exercised and no
                            winner is recorded.
                        </FaqItem>
                    </Section>
                </article>
            </div>

            <style>{`
                .docs-prose h2 {
                    font-family: var(--font-display);
                    font-size: 1.5rem;
                    font-weight: 500;
                    color: var(--text-primary);
                    margin-bottom: 0.5rem;
                    border-bottom: 2px solid var(--accent-brand);
                    padding-bottom: 0.5rem;
                }
                .docs-prose h3 {
                    font-family: var(--font-sans);
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-top: 1.75rem;
                    margin-bottom: 0.5rem;
                }
                .docs-prose p {
                    line-height: 1.7;
                    color: var(--text-primary);
                }
                .docs-prose ul, .docs-prose ol {
                    list-style: disc;
                    padding-left: 1.5rem;
                    line-height: 1.7;
                    color: var(--text-primary);
                }
                .docs-prose ol { list-style: decimal; }
                .docs-prose li + li { margin-top: 0.3rem; }
                .docs-prose code {
                    font-family: var(--font-mono);
                    font-size: 0.875em;
                    background: var(--surface-sunken);
                    color: var(--text-primary);
                    padding: 0.15rem 0.35rem;
                    border-radius: var(--radius-sm);
                }
                .docs-prose a {
                    color: var(--accent-brand);
                    text-decoration: underline;
                    text-underline-offset: 2px;
                }
                .docs-prose a:hover { text-decoration-thickness: 2px; }
                .docs-prose dl dt {
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .docs-prose dl dd {
                    color: var(--text-secondary);
                    margin-top: 0.15rem;
                }
                .docs-prose strong { color: var(--text-primary); }
            `}</style>
        </AppShell>
    )
}

function Section({
    id,
    title,
    children,
}: {
    id: string
    title: string
    children: React.ReactNode
}) {
    return (
        <section id={id} className="scroll-mt-8 space-y-3">
            <h2>{title}</h2>
            {children}
        </section>
    )
}

function SubSection({
    id,
    title,
    children,
}: {
    id: string
    title: string
    children: React.ReactNode
}) {
    return (
        <div id={id} className="scroll-mt-8 space-y-2">
            <h3>{title}</h3>
            {children}
        </div>
    )
}

function GlossaryItem({
    term,
    children,
}: {
    term: string
    children: React.ReactNode
}) {
    return (
        <div>
            <dt>{term}</dt>
            <dd>{children}</dd>
        </div>
    )
}

function FaqItem({
    question,
    children,
}: {
    question: string
    children: React.ReactNode
}) {
    return (
        <details className="border border-[color:var(--border-subtle)] rounded-[var(--radius-md)] p-3 [&[open]]:bg-[color:var(--surface-raised)]">
            <summary className="cursor-pointer font-medium text-[color:var(--text-primary)]">
                {question}
            </summary>
            <div className="mt-2 text-[0.9375rem]">{children}</div>
        </details>
    )
}
