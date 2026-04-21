'use client'

import { Star, Trash2 } from 'lucide-react'
import { Fragment, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { DestructiveConfirmModal } from '@/components/ui/DestructiveConfirmModal'
import type { RichContent } from '@/lib/rich-content'
import { formatDateTime } from '@/lib/format-time'
import { clearRestaurantRichContent } from '../actions'

type Props = {
    restaurantId: string
    restaurantName: string
    richContent: RichContent
}

export function RichContentCard({
    restaurantId,
    restaurantName,
    richContent,
}: Props) {
    const router = useRouter()
    const [confirmOpen, setConfirmOpen] = useState(false)

    const handleClear = async () => {
        const fd = new FormData()
        fd.append('id', restaurantId)
        await clearRestaurantRichContent(fd)
        router.refresh()
    }

    const rating = richContent.rating
    const ratingParts: ReactNode[] = []
    if (rating) {
        ratingParts.push(
            <span className="inline-flex items-center gap-1">
                <Star
                    size={14}
                    strokeWidth={0}
                    fill="currentColor"
                    aria-hidden="true"
                    className="text-[color:var(--banked-fg)]"
                />
                <span className="font-mono tabular-nums">
                    {rating.value.toFixed(1)}
                </span>
            </span>,
        )
        if (rating.ratings_count_display)
            ratingParts.push(
                <span>{rating.ratings_count_display} ratings</span>,
            )
        if (rating.reviews_count_display)
            ratingParts.push(
                <span>{rating.reviews_count_display} public reviews</span>,
            )
    }

    return (
        <Card className="space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="font-display font-medium text-[1rem] text-[color:var(--text-primary)]">
                        Rich content
                    </h2>
                    <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
                        Imported from{' '}
                        <a
                            href={richContent.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[color:var(--link-fg)] underline underline-offset-2"
                        >
                            DoorDash ↗
                        </a>{' '}
                        · Fetched {formatDateTime(richContent.fetched_at)}
                    </p>
                </div>
                <Button
                    variant="ghost-destructive"
                    size="sm"
                    leftIcon={Trash2}
                    onClick={() => setConfirmOpen(true)}
                >
                    Clear
                </Button>
            </div>

            {richContent.cover_image_url && (
                <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={richContent.cover_image_url}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full max-h-[240px] object-cover rounded-[var(--radius-md)]"
                    />
                    {richContent.avatar_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={richContent.avatar_image_url}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="absolute left-3 bottom-3 w-16 h-16 rounded-full border-2 border-[color:var(--surface-raised)] bg-[color:var(--surface-raised)] object-cover shadow-[var(--shadow-card-rest)]"
                        />
                    )}
                </div>
            )}

            {(richContent.cuisines.length > 0 ||
                richContent.price_range ||
                ratingParts.length > 0) && (
                <div className="flex flex-wrap items-center gap-2">
                    {richContent.cuisines.map((c) => (
                        <Chip key={c} variant="neutral">
                            {c}
                        </Chip>
                    ))}
                    {richContent.price_range && (
                        <span className="text-[0.8125rem] font-mono text-[color:var(--text-secondary)]">
                            {richContent.price_range}
                        </span>
                    )}
                    {ratingParts.length > 0 && (
                        <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.8125rem] text-[color:var(--text-secondary)]">
                            {ratingParts.map((n, i) => (
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
                            ))}
                        </span>
                    )}
                </div>
            )}

            {richContent.address && (
                <p className="text-[0.8125rem] text-[color:var(--text-tertiary)]">
                    {richContent.address}
                </p>
            )}

            {richContent.menu_items.length > 0 && (
                <div className="space-y-2">
                    <h3 className="font-display font-medium text-[0.875rem] text-[color:var(--text-primary)]">
                        Menu items
                    </h3>
                    <ul className="divide-y divide-[color:var(--border-subtle)]">
                        {richContent.menu_items.map((item, idx) => (
                            <li
                                key={`${item.name}-${idx}`}
                                className="py-2.5 flex items-start gap-3"
                            >
                                {item.image_url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={item.image_url}
                                        alt=""
                                        referrerPolicy="no-referrer"
                                        className="shrink-0 w-14 h-14 rounded-[var(--radius-sm)] object-cover bg-[color:var(--surface-sunken)]"
                                    />
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-medium text-[0.875rem] text-[color:var(--text-primary)]">
                                            {item.name}
                                        </span>
                                        {item.price && (
                                            <span className="font-mono tabular-nums text-[0.8125rem] text-[color:var(--text-secondary)] shrink-0">
                                                {item.price}
                                            </span>
                                        )}
                                    </div>
                                    {item.description && (
                                        <p className="text-[0.8125rem] text-[color:var(--text-secondary)] mt-0.5">
                                            {item.description}
                                        </p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <p className="text-[0.75rem] text-[color:var(--text-tertiary)]">
                To refresh this data, open the DoorDash page and click the
                bookmarklet again.
            </p>

            <DestructiveConfirmModal
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Clear rich content?"
                target={restaurantName}
                destructiveLabel="Clear"
                onConfirm={handleClear}
            >
                This removes the imported DoorDash data. The restaurant stays
                in the catalog — you can re-import later from DoorDash.
            </DestructiveConfirmModal>
        </Card>
    )
}
