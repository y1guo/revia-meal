import { restaurantColor } from '@/lib/restaurant-colors'
import { cn } from '@/lib/cn'

export type FlavorSegment = {
    restaurantId: string
    restaurantName: string
    weight: number
    polls: number
}

type FlavorBarProps = {
    segments: FlavorSegment[]
    height?: number
    className?: string
}

/**
 * Horizontal stacked bar. Segment width is proportional to its weight within
 * the total. Segment labels appear inline when there's room; otherwise they
 * are carried by the title attribute (full tooltip handling lives in a
 * client wrapper if needed, see BankedCreditChip for the pattern).
 */
export function FlavorBar({ segments, height = 32, className }: FlavorBarProps) {
    const total = segments.reduce((s, seg) => s + seg.weight, 0)
    if (total <= 0) return null

    return (
        <div
            className={cn(
                'flex w-full overflow-hidden rounded-[var(--radius-md)]',
                className,
            )}
            style={{ height }}
            role="list"
        >
            {segments.map((seg) => {
                const pct = (seg.weight / total) * 100
                const color = restaurantColor(seg.restaurantName)
                return (
                    <div
                        key={seg.restaurantId}
                        role="listitem"
                        className="relative flex items-center justify-center text-[0.6875rem] font-medium text-white truncate px-2 border-l first:border-l-0 border-[color:var(--surface-base)]"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                        title={`${seg.restaurantName} · ${formatNum(seg.weight)} (${seg.polls} ${seg.polls === 1 ? 'poll' : 'polls'})`}
                    >
                        {pct >= 8 && (
                            <span className="truncate">
                                {seg.restaurantName}
                            </span>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function formatNum(n: number): string {
    return n.toFixed(2).replace(/\.?0+$/, '')
}
