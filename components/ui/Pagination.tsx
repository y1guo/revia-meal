'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/cn'

type PaginationProps = {
    /** 1-indexed current page. */
    page: number
    /** Total number of rows across all pages. */
    total: number
    pageSize: number
    /** Query-string key for the page number. Defaults to "page". */
    paramKey?: string
    className?: string
}

/**
 * URL-driven pagination. Renders Prev/Next plus compact page numbers around
 * the current page. Preserves any other searchParams (search, filters) in
 * every link.
 */
export function Pagination({
    page,
    total,
    pageSize,
    paramKey = 'page',
    className,
}: PaginationProps) {
    const searchParams = useSearchParams()
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    if (totalPages <= 1) return null

    const hrefFor = (target: number): string => {
        const params = new URLSearchParams(searchParams.toString())
        if (target <= 1) params.delete(paramKey)
        else params.set(paramKey, String(target))
        const qs = params.toString()
        return qs ? `?${qs}` : '?'
    }

    const numbers = buildPageWindow(page, totalPages)
    const fromRow = (page - 1) * pageSize + 1
    const toRow = Math.min(page * pageSize, total)

    return (
        <nav
            aria-label="Pagination"
            className={cn(
                'flex flex-col gap-3 md:flex-row md:items-center md:justify-between',
                className,
            )}
        >
            <p className="text-[0.8125rem] tabular-nums text-[color:var(--text-secondary)]">
                Showing{' '}
                <span className="font-medium text-[color:var(--text-primary)]">
                    {fromRow.toLocaleString()}
                </span>
                {' – '}
                <span className="font-medium text-[color:var(--text-primary)]">
                    {toRow.toLocaleString()}
                </span>{' '}
                of{' '}
                <span className="font-medium text-[color:var(--text-primary)]">
                    {total.toLocaleString()}
                </span>
            </p>
            <ul className="flex items-center gap-1">
                <li>
                    <PageLink
                        href={hrefFor(page - 1)}
                        disabled={page <= 1}
                        aria-label="Previous page"
                    >
                        <ChevronLeft
                            size={14}
                            strokeWidth={1.75}
                            aria-hidden="true"
                        />
                    </PageLink>
                </li>
                {numbers.map((n, i) =>
                    n === '…' ? (
                        <li
                            key={`ellipsis-${i}`}
                            className="px-1 text-[color:var(--text-tertiary)] select-none"
                        >
                            …
                        </li>
                    ) : (
                        <li key={n}>
                            <PageLink
                                href={hrefFor(n)}
                                active={n === page}
                                aria-label={`Page ${n}`}
                                aria-current={n === page ? 'page' : undefined}
                            >
                                {n}
                            </PageLink>
                        </li>
                    ),
                )}
                <li>
                    <PageLink
                        href={hrefFor(page + 1)}
                        disabled={page >= totalPages}
                        aria-label="Next page"
                    >
                        <ChevronRight
                            size={14}
                            strokeWidth={1.75}
                            aria-hidden="true"
                        />
                    </PageLink>
                </li>
            </ul>
        </nav>
    )
}

function PageLink({
    href,
    active,
    disabled,
    children,
    ...rest
}: {
    href: string
    active?: boolean
    disabled?: boolean
    children: React.ReactNode
} & Omit<React.ComponentProps<typeof Link>, 'href' | 'className'>) {
    const className = cn(
        'inline-flex h-8 min-w-[32px] items-center justify-center px-2',
        'rounded-[var(--radius-md)]',
        'text-[0.8125rem] font-medium tabular-nums',
        'transition-colors duration-150',
        active
            ? 'bg-[color:var(--accent-brand)] text-[color:var(--text-on-accent)]'
            : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-sunken)] hover:text-[color:var(--text-primary)]',
        disabled && 'opacity-40 pointer-events-none',
    )
    if (disabled) {
        return (
            <span aria-disabled="true" className={className}>
                {children}
            </span>
        )
    }
    return (
        <Link href={href} className={className} scroll={false} {...rest}>
            {children}
        </Link>
    )
}

/**
 * Compact window around the current page: always first and last, neighbors of
 * current, and "…" gaps when there's a jump. Example (current=5, total=12):
 * [1, …, 4, 5, 6, …, 12]
 */
function buildPageWindow(
    current: number,
    total: number,
): Array<number | '…'> {
    if (total <= 7)
        return Array.from({ length: total }, (_, i) => i + 1)
    const out: Array<number | '…'> = [1]
    const windowStart = Math.max(2, current - 1)
    const windowEnd = Math.min(total - 1, current + 1)
    if (windowStart > 2) out.push('…')
    for (let i = windowStart; i <= windowEnd; i++) out.push(i)
    if (windowEnd < total - 1) out.push('…')
    out.push(total)
    return out
}
