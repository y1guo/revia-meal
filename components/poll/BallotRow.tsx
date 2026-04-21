'use client'

import { ChevronDown, Star } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import type { RichContent } from '@/lib/rich-content'
import { cn } from '@/lib/cn'

type BallotRowProps = {
    name: string
    doordashUrl: string | null
    notes: string | null
    richContent: RichContent | null
    /** Slot rendered at the start of the row — typically a checkbox, or null for read-only views. */
    leading?: ReactNode
    /** Slot next to the name — banked chip, "removed" chip, "you voted" chip, etc. */
    nameSuffix?: ReactNode
    /** Mutes colors for disabled/preview modes. */
    muted?: boolean
    expanded: boolean
    onToggleExpanded: () => void
    /** Stable id used for aria-controls linking to the expand panel. */
    rowId: string
}

export function BallotRow({
    name,
    doordashUrl,
    notes,
    richContent,
    leading,
    nameSuffix,
    muted,
    expanded,
    onToggleExpanded,
    rowId,
}: BallotRowProps) {
    const hasRich = richContent !== null
    const metaNodes = hasRich ? metaLineNodes(richContent) : []

    return (
        <div
            className={cn(
                'flex items-start gap-3',
                'px-4 py-3 md:px-5 md:py-4',
            )}
        >
            {leading != null && (
                <div className="mt-0.5 shrink-0">{leading}</div>
            )}
            {hasRich && (
                <Thumbnail
                    name={name}
                    imageUrl={
                        richContent.avatar_image_url ??
                        richContent.cover_image_url
                    }
                    muted={muted}
                />
            )}
            <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={cn(
                            'font-medium',
                            muted
                                ? 'text-[color:var(--text-tertiary)]'
                                : 'text-[color:var(--text-primary)]',
                        )}
                    >
                        {name}
                    </span>
                    {nameSuffix}
                    {!hasRich && doordashUrl && (
                        <DoordashHeaderLink
                            href={doordashUrl}
                            muted={muted}
                        />
                    )}
                </div>
                {metaNodes.length > 0 && (
                    <div
                        className={cn(
                            'flex flex-wrap items-center gap-x-1.5 gap-y-0.5',
                            'text-[0.8125rem]',
                            muted
                                ? 'text-[color:var(--text-tertiary)]'
                                : 'text-[color:var(--text-secondary)]',
                        )}
                    >
                        {interleaveDots(metaNodes)}
                    </div>
                )}
                {!hasRich && notes && (
                    <p
                        className={cn(
                            'text-[0.8125rem]',
                            muted
                                ? 'text-[color:var(--text-tertiary)]'
                                : 'text-[color:var(--text-secondary)]',
                        )}
                    >
                        {notes}
                    </p>
                )}
            </div>
            {hasRich && (
                <DetailsButton
                    expanded={expanded}
                    onToggle={onToggleExpanded}
                    rowId={rowId}
                />
            )}
        </div>
    )
}

type BallotRowExpandProps = {
    richContent: RichContent
    notes: string | null
    rowId: string
}

export function BallotRowExpand({
    richContent,
    notes,
    rowId,
}: BallotRowExpandProps) {
    const infoNodes = expandInfoNodes(richContent)
    return (
        <div
            id={rowId}
            className={cn(
                'border-t border-[color:var(--border-subtle)]',
                'bg-[color:var(--surface-sunken)]',
                'px-4 py-4 md:px-5 md:py-5',
                'space-y-4',
                'animate-fade-slide-up',
            )}
        >
            {richContent.hero_image_url && (
                <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={richContent.hero_image_url}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full max-h-[200px] object-cover rounded-[var(--radius-md)]"
                    />
                    {richContent.avatar_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={richContent.avatar_image_url}
                            alt=""
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="absolute left-3 bottom-3 w-14 h-14 rounded-full border-2 border-[color:var(--surface-raised)] bg-[color:var(--surface-raised)] object-cover shadow-[var(--shadow-card-rest)]"
                        />
                    )}
                </div>
            )}
            {infoNodes.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.8125rem] text-[color:var(--text-secondary)]">
                    {interleaveDots(infoNodes)}
                </div>
            )}
            {richContent.menu_items.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-display font-medium text-[0.875rem] text-[color:var(--text-primary)]">
                        Featured items
                    </h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                        {richContent.menu_items.map((item, idx) => (
                            <li
                                key={`${item.name}-${idx}`}
                                className="flex items-start gap-2.5"
                            >
                                {item.image_url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={item.image_url}
                                        alt=""
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                        className="shrink-0 w-12 h-12 rounded-[var(--radius-sm)] object-cover bg-[color:var(--surface-raised)]"
                                    />
                                )}
                                <div className="min-w-0 flex-1 space-y-0.5">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-medium text-[0.875rem] text-[color:var(--text-primary)] truncate">
                                            {item.name}
                                        </span>
                                        {item.price && (
                                            <span className="font-mono tabular-nums text-[0.8125rem] text-[color:var(--text-secondary)] shrink-0">
                                                {item.price}
                                            </span>
                                        )}
                                    </div>
                                    {item.description && (
                                        <p className="text-[0.75rem] text-[color:var(--text-secondary)] line-clamp-2">
                                            {item.description}
                                        </p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {notes && (
                <p className="text-[0.8125rem] text-[color:var(--text-secondary)] italic">
                    {notes}
                </p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-[0.8125rem]">
                <a
                    href={richContent.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[color:var(--link-fg)] hover:text-[color:var(--accent-brand)] transition-colors duration-150"
                >
                    Menu prices and details on DoorDash ↗
                </a>
            </div>
        </div>
    )
}

function StarRating({ value }: { value: number }) {
    return (
        <span className="inline-flex items-center gap-1">
            <Star
                size={14}
                strokeWidth={0}
                fill="currentColor"
                aria-hidden="true"
                className="text-[color:var(--banked-fg)]"
            />
            <span className="font-mono tabular-nums">{value.toFixed(1)}</span>
        </span>
    )
}

function metaLineNodes(r: RichContent): ReactNode[] {
    const nodes: ReactNode[] = []
    if (r.cuisines.length > 0) nodes.push(<span>{r.cuisines.join(', ')}</span>)
    if (r.price_range) nodes.push(<span>{r.price_range}</span>)
    if (r.rating) nodes.push(<StarRating value={r.rating.value} />)
    return nodes
}

function expandInfoNodes(r: RichContent): ReactNode[] {
    const nodes: ReactNode[] = []
    if (r.rating) nodes.push(<StarRating value={r.rating.value} />)
    if (r.rating?.ratings_count_display)
        nodes.push(<span>{r.rating.ratings_count_display} ratings</span>)
    if (r.rating?.reviews_count_display)
        nodes.push(<span>{r.rating.reviews_count_display} public reviews</span>)
    if (r.address) nodes.push(<span>{r.address}</span>)
    return nodes
}

function interleaveDots(nodes: ReactNode[]): ReactNode {
    return nodes.map((n, i) => (
        <Fragment key={i}>
            {i > 0 && (
                <span
                    aria-hidden="true"
                    className="text-[color:var(--text-tertiary)]"
                >
                    ·
                </span>
            )}
            {n}
        </Fragment>
    ))
}

function Thumbnail({
    name,
    imageUrl,
    muted,
}: {
    name: string
    imageUrl: string | null
    muted?: boolean
}) {
    if (imageUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={imageUrl}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className={cn(
                    'shrink-0 w-14 h-14 md:w-16 md:h-16',
                    'rounded-[var(--radius-md)] object-cover',
                    'bg-[color:var(--surface-sunken)]',
                    muted && 'opacity-60',
                )}
            />
        )
    }
    return (
        <div
            className={cn(
                'shrink-0 w-14 h-14 md:w-16 md:h-16',
                'rounded-[var(--radius-md)]',
                'bg-[color:var(--surface-sunken)]',
                'border border-[color:var(--border-subtle)]',
                'flex items-center justify-center',
                'font-display font-medium text-[1rem]',
                muted
                    ? 'text-[color:var(--text-tertiary)]'
                    : 'text-[color:var(--text-secondary)]',
            )}
            aria-hidden="true"
        >
            {getMonogram(name)}
        </div>
    )
}

function getMonogram(name: string): string {
    const trimmed = name.trim()
    if (!trimmed) return '?'
    const words = trimmed.split(/\s+/)
    if (words.length === 1) return firstChar(words[0]).toUpperCase()
    return (firstChar(words[0]) + firstChar(words[1])).toUpperCase()
}

function firstChar(s: string): string {
    // Handle surrogate pairs & combining marks gracefully — covers CJK names like "味鼎".
    const iterator = s[Symbol.iterator]()
    const first = iterator.next().value
    return typeof first === 'string' ? first : s[0] ?? ''
}

function DoordashHeaderLink({
    href,
    muted,
}: {
    href: string
    muted?: boolean
}) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={cn(
                'inline-block text-[0.8125rem] font-medium transition-colors duration-150',
                muted
                    ? 'text-[color:var(--text-tertiary)]'
                    : 'text-[color:var(--link-fg)] hover:text-[color:var(--accent-brand)]',
            )}
        >
            DoorDash ↗
        </a>
    )
}

function DetailsButton({
    expanded,
    onToggle,
    rowId,
}: {
    expanded: boolean
    onToggle: () => void
    rowId: string
}) {
    return (
        <button
            type="button"
            aria-expanded={expanded}
            aria-controls={rowId}
            onClick={(e) => {
                // Prevent the surrounding <label> (vote form) from toggling the checkbox.
                e.preventDefault()
                e.stopPropagation()
                onToggle()
            }}
            className={cn(
                'mt-0.5 shrink-0',
                'inline-flex items-center gap-1',
                'h-8 px-2.5 rounded-[var(--radius-md)]',
                'text-[0.8125rem] font-medium',
                'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]',
                'hover:bg-[color:var(--surface-sunken)]',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]',
            )}
        >
            {expanded ? 'Hide' : 'Details'}
            <ChevronDown
                size={14}
                strokeWidth={2}
                aria-hidden="true"
                className={cn(
                    'transition-transform duration-200',
                    expanded && 'rotate-180',
                )}
            />
        </button>
    )
}
