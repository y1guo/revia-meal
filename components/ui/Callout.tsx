import { Info, Lightbulb, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type CalloutTone = 'note' | 'tip' | 'warning'

type Props = {
    tone?: CalloutTone
    title?: string
    children: ReactNode
    className?: string
}

const TONES: Record<CalloutTone, { icon: LucideIcon; bar: string; iconColor: string }> = {
    note: {
        icon: Info,
        bar: 'bg-[color:var(--accent-brand)]',
        iconColor: 'text-[color:var(--accent-brand)]',
    },
    tip: {
        icon: Lightbulb,
        bar: 'bg-lime-600 dark:bg-lime-400',
        iconColor: 'text-lime-700 dark:text-lime-400',
    },
    warning: {
        icon: TriangleAlert,
        bar: 'bg-sunny-600 dark:bg-sunny-400',
        iconColor: 'text-sunny-800 dark:text-sunny-400',
    },
}

export function Callout({ tone = 'note', title, children, className }: Props) {
    const { icon: Icon, bar, iconColor } = TONES[tone]
    return (
        <div
            className={cn(
                'relative overflow-hidden',
                'rounded-[var(--radius-md)]',
                'bg-[color:var(--surface-raised)]',
                'border border-[color:var(--border-subtle)]',
                'pl-4 pr-4 py-3',
                className,
            )}
            role="note"
        >
            <span
                aria-hidden="true"
                className={cn('absolute left-0 top-0 bottom-0 w-1', bar)}
            />
            <div className="flex items-start gap-2.5 pl-2">
                <Icon
                    size={16}
                    strokeWidth={1.75}
                    className={cn('mt-0.5 shrink-0', iconColor)}
                    aria-hidden="true"
                />
                <div className="flex-1 min-w-0 text-[0.875rem] leading-relaxed text-[color:var(--text-primary)]">
                    {title && (
                        <div className="font-medium mb-0.5">{title}</div>
                    )}
                    {children}
                </div>
            </div>
        </div>
    )
}
