/**
 * Single source of truth for the left-sidebar navigation on the /docs
 * multi-page structure. Group headings are non-clickable labels; each link
 * is a slug under `/docs/`.
 */

export type DocsLink = { slug: string; label: string }
export type DocsGroup = { heading: string; links: DocsLink[] }

export const DOCS_NAV: DocsGroup[] = [
    {
        heading: 'Getting started',
        links: [
            { slug: '', label: 'Overview' },
            { slug: 'your-day', label: 'Voting & daily use' },
        ],
    },
    {
        heading: 'Core mechanics',
        links: [
            { slug: 'rolling-credits', label: 'Rolling credits' },
            { slug: 'daily-lock', label: 'One poll per day' },
        ],
    },
    {
        heading: 'API',
        links: [{ slug: 'api-keys', label: 'API keys' }],
    },
    {
        heading: 'For admins',
        links: [{ slug: 'for-admins', label: 'Admin surfaces' }],
    },
    {
        heading: 'Reference',
        links: [
            { slug: 'glossary', label: 'Glossary' },
            { slug: 'faq', label: 'FAQ' },
        ],
    },
]

/**
 * Resolve `slug` to an href. Empty slug means the `/docs` root (Overview).
 */
export function docsHref(slug: string): string {
    return slug === '' ? '/docs' : `/docs/${slug}`
}
