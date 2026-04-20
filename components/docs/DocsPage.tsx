import type { ReactNode } from 'react'
import { OnThisPage, type OnThisPageItem } from './OnThisPage'

type Props = {
    children: ReactNode
    /**
     * Items for the "On this page" right rail. Omit for single-topic pages
     * that have no H3 anchors worth listing.
     */
    onThisPage?: OnThisPageItem[]
}

/**
 * Per-page wrapper that pairs a max-760px `docs-prose` article with the
 * right-rail OnThisPage (scroll-spy). Used inside `app/docs/[slug]/page.tsx`.
 */
export function DocsPage({ children, onThisPage }: Props) {
    return (
        <div className="flex gap-10 xl:gap-12">
            <article className="docs-prose flex-1 min-w-0 max-w-[760px]">
                {children}
            </article>
            {onThisPage && onThisPage.length > 0 && (
                <OnThisPage items={onThisPage} />
            )}
        </div>
    )
}
