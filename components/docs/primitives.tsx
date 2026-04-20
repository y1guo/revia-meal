import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Reusable primitives for a docs page: eyebrow-labeled top-level Section,
 * nested SubSection (h3 anchor), CodeBlock, dl-based Glossary entries, and a
 * chevron-accordion FaqItem. Keep these presentation-only so individual
 * /docs/[slug] pages only supply copy.
 */

export function Section({
    id,
    eyebrow,
    title,
    children,
}: {
    id?: string
    eyebrow?: string
    title: string
    children: ReactNode
}) {
    return (
        <section
            id={id}
            className={cn(id ? 'scroll-mt-24' : '', 'space-y-3')}
        >
            <div>
                {eyebrow && <span className="eyebrow">{eyebrow}</span>}
                <h2>{title}</h2>
            </div>
            {children}
        </section>
    )
}

export function SubSection({
    id,
    title,
    children,
}: {
    id: string
    title: string
    children: ReactNode
}) {
    return (
        <div id={id} className="scroll-mt-24 space-y-2">
            <h3>{title}</h3>
            {children}
        </div>
    )
}

export function CodeBlock({ children }: { children: ReactNode }) {
    return (
        <pre
            className={cn(
                'text-[0.8125rem] font-mono',
                'bg-[color:var(--surface-sunken)]',
                'border border-[color:var(--border-subtle)]',
                'rounded-[var(--radius-md)] p-3.5',
                'overflow-x-auto',
                'text-[color:var(--text-primary)]',
            )}
        >
            {children}
        </pre>
    )
}

export function GlossaryItem({
    term,
    children,
}: {
    term: string
    children: ReactNode
}) {
    return (
        <div>
            <dt>{term}</dt>
            <dd>{children}</dd>
        </div>
    )
}

export function FaqItem({
    question,
    children,
}: {
    question: string
    children: ReactNode
}) {
    return (
        <details
            className={cn(
                'group rounded-[var(--radius-md)]',
                'border border-[color:var(--border-subtle)]',
                'bg-[color:var(--surface-raised)]',
                'transition-colors duration-150',
                'open:border-[color:var(--accent-brand)]/40',
            )}
        >
            <summary
                className={cn(
                    'flex items-center justify-between gap-3 cursor-pointer',
                    'px-4 py-3',
                    'font-medium text-[color:var(--text-primary)]',
                    'text-[0.9375rem] leading-snug',
                    '[&::-webkit-details-marker]:hidden',
                )}
            >
                <span>{question}</span>
                <svg
                    className={cn(
                        'shrink-0 text-[color:var(--text-tertiary)]',
                        'transition-transform duration-200',
                        'group-open:rotate-180',
                    )}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </summary>
            <div className="px-4 pb-4 text-[0.9375rem] leading-relaxed text-[color:var(--text-secondary)]">
                {children}
            </div>
        </details>
    )
}

/**
 * Per-page header. Keeps eyebrow + display title + optional lead copy
 * consistent across all /docs/[slug] pages.
 */
export function DocsPageHeader({
    eyebrow,
    title,
    lead,
}: {
    eyebrow?: string
    title: string
    lead?: ReactNode
}) {
    return (
        <header className="mb-10">
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h1
                className={cn(
                    'font-display font-semibold tracking-tight',
                    'text-[2.25rem] leading-[1.1]',
                    'text-[color:var(--text-primary)]',
                )}
            >
                {title}
            </h1>
            {lead && (
                <p className="mt-3 text-[1rem] leading-relaxed text-[color:var(--text-secondary)]">
                    {lead}
                </p>
            )}
        </header>
    )
}
