'use client'

import Link from 'next/link'
import { CoinGlyph } from '@/components/icons/CoinGlyph'
import { cn } from '@/lib/cn'
import { Tooltip } from './Tooltip'

type BankedCreditChipProps = {
    /** Amount banked. Chip is suppressed when <= 0. */
    weight: number
    /** Restaurant name, used in the tooltip copy. */
    restaurantName: string
    className?: string
}

function formatWeight(weight: number): string {
    const trimmed = weight.toFixed(2).replace(/\.?0+$/, '')
    return `+${trimmed}`
}

function voteCopy(weight: number): string {
    if (weight === 0.5) return 'half a vote'
    if (weight === 1) return 'one vote'
    const trimmed = weight.toFixed(2).replace(/\.?0+$/, '')
    return `${trimmed} votes`
}

export function BankedCreditChip({
    weight,
    restaurantName,
    className,
}: BankedCreditChipProps) {
    if (weight <= 0) return null

    return (
        <Tooltip
            content={
                <div className="space-y-1">
                    <div>
                        You have {voteCopy(weight)} banked for {restaurantName}{' '}
                        from a previous poll. If {restaurantName} wins and you
                        pick it today, this exercises.
                    </div>
                    <Link
                        href="/docs#banked-credits"
                        className="text-[color:var(--link-fg)] underline underline-offset-2"
                    >
                        Learn more →
                    </Link>
                </div>
            }
        >
            <span
                className={cn(
                    'inline-flex items-center gap-1.5',
                    'h-[26px] px-2.5 rounded-full',
                    'bg-[color:var(--banked-bg)] text-[color:var(--banked-fg)]',
                    'text-[0.75rem] font-medium leading-none whitespace-nowrap',
                    'cursor-help',
                    className,
                )}
                tabIndex={0}
                role="note"
                aria-label={`${formatWeight(weight)} credits banked for ${restaurantName}`}
            >
                <CoinGlyph size={14} />
                <span className="font-mono tabular-nums">
                    {formatWeight(weight)}
                </span>
                <span>banked</span>
            </span>
        </Tooltip>
    )
}
