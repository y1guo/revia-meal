import { signOut } from '@/app/actions'
import { DocsSidebarNav } from '@/components/docs/DocsSidebarNav'
import { AppShell } from '@/components/shell/AppShell'
import { requireUser } from '@/lib/auth'

export default async function DocsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await requireUser()

    return (
        <AppShell
            user={user}
            signOutAction={signOut}
            maxWidthClassName="max-w-[1280px]"
        >
            <div className="flex gap-10 lg:gap-12">
                <DocsSidebarNav />
                <div className="flex-1 min-w-0">{children}</div>
            </div>

            {/* Shared prose styles for every docs page. */}
            <style>{`
                .docs-prose h2 {
                    font-family: var(--font-display);
                    font-size: 1.5rem;
                    font-weight: 500;
                    letter-spacing: -0.01em;
                    line-height: 1.2;
                    color: var(--text-primary);
                    margin-top: 2.5rem;
                    margin-bottom: 0.75rem;
                }
                .docs-prose .eyebrow {
                    display: block;
                    font-size: 0.6875rem;
                    font-weight: 600;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    color: var(--link-fg);
                    margin-bottom: 0.5rem;
                }
                .docs-prose h3 {
                    font-family: var(--font-display);
                    font-size: 1.125rem;
                    font-weight: 500;
                    letter-spacing: -0.01em;
                    color: var(--text-primary);
                    margin-top: 1.75rem;
                    margin-bottom: 0.5rem;
                }
                .docs-prose p {
                    line-height: 1.7;
                    color: var(--text-primary);
                }
                .docs-prose p + p { margin-top: 1rem; }
                .docs-prose ul, .docs-prose ol {
                    list-style: disc;
                    padding-left: 1.5rem;
                    line-height: 1.7;
                    color: var(--text-primary);
                }
                .docs-prose ol { list-style: decimal; }
                .docs-prose li + li { margin-top: 0.35rem; }
                .docs-prose code {
                    font-family: var(--font-mono);
                    font-size: 0.8125em;
                    background: var(--surface-sunken);
                    color: var(--text-primary);
                    padding: 0.15rem 0.4rem;
                    border-radius: var(--radius-sm);
                    border: 1px solid var(--border-subtle);
                }
                .docs-prose a:not(.no-underline) {
                    color: var(--link-fg);
                    text-decoration: underline;
                    text-underline-offset: 3px;
                    text-decoration-thickness: 1px;
                    transition: text-decoration-thickness 120ms;
                }
                .docs-prose a:not(.no-underline):hover { text-decoration-thickness: 2px; }
                .docs-prose dl dt {
                    font-family: var(--font-display);
                    font-weight: 500;
                    font-size: 1rem;
                    color: var(--text-primary);
                }
                .docs-prose dl dd {
                    color: var(--text-secondary);
                    margin-top: 0.25rem;
                    line-height: 1.6;
                }
                .docs-prose strong {
                    color: var(--text-primary);
                    font-weight: 600;
                }
            `}</style>
        </AppShell>
    )
}
