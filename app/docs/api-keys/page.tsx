import type { Metadata } from 'next'
import Link from 'next/link'
import { DocsPage } from '@/components/docs/DocsPage'
import {
    CodeBlock,
    DocsPageHeader,
    SubSection,
} from '@/components/docs/primitives'
import { Callout } from '@/components/ui/Callout'

export const metadata: Metadata = { title: 'API keys · Guide' }

const TOC = [
    { id: 'generating-a-key', label: 'Generating a key' },
    { id: 'what-a-key-can-do', label: 'What a key can do' },
    { id: 'security-notes', label: 'Security notes' },
]

export default function ApiKeys() {
    return (
        <DocsPage onThisPage={TOC}>
            <DocsPageHeader
                eyebrow="API"
                title="API keys"
                lead="Authenticate programmatic requests to HeyRevia Meal&rsquo;s API &mdash; for the future Slack cron integration, one-off scripts, and whatever you want to build on top."
            />

            <SubSection id="generating-a-key" title="Generating a key">
                <p>
                    Go to <Link href="/settings">Settings</Link>, name your
                    key, and click Create. You&rsquo;ll see the plaintext
                    token <em>exactly once</em> &mdash; copy it
                    immediately into whatever will use it. After that,
                    only a hash is stored; we cannot retrieve the
                    plaintext for you.
                </p>
                <p>
                    If you lose the plaintext, revoke the key and create a
                    new one.
                </p>
            </SubSection>

            <SubSection id="what-a-key-can-do" title="What a key can do">
                <p>
                    An API key inherits <strong>your current role</strong>.
                    If you&rsquo;re a regular user, your key can call
                    anything a regular user can do. If you&rsquo;re an
                    admin, your key can call admin endpoints.
                </p>
                <p>
                    If your role changes (e.g. you&rsquo;re promoted to
                    admin), existing keys pick up the new role
                    automatically. If you&rsquo;re deactivated, your keys
                    stop working on the next call.
                </p>
                <p>
                    Use the key by sending it in the Authorization header:
                </p>
                <CodeBlock>
                    Authorization: Bearer rk_your_key_here
                </CodeBlock>
                <p>Currently exposed endpoints:</p>
                <ul>
                    <li>
                        <code>GET /api/v1/polls/today</code> &mdash;
                        today&rsquo;s polls across all active templates.
                    </li>
                    <li>
                        <code>GET /api/v1/polls/:id/results</code> &mdash;
                        a specific poll&rsquo;s ballot, tallies (for
                        concluded polls), and voter list.
                    </li>
                </ul>
            </SubSection>

            <SubSection id="security-notes" title="Security notes">
                <Callout tone="warning" title="Treat tokens like passwords">
                    Anyone who has the plaintext can act as you. Never
                    check keys into git or paste them into shared docs.
                    Use environment variables or a secret manager.
                </Callout>
                <ul>
                    <li>
                        Revoke unused or suspicious keys. Revocation is
                        immediate and permanent; the key cannot be
                        restored.
                    </li>
                    <li>
                        The <em>Last used</em> timestamp on the settings
                        page tells you whether a key is still actively
                        being used.
                    </li>
                </ul>
            </SubSection>
        </DocsPage>
    )
}
