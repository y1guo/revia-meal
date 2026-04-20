import { X, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type ChipVariant =
    | 'neutral'
    | 'accent'
    | 'success'
    | 'info'
    | 'danger'

type ChipProps = {
    variant?: ChipVariant
    leftIcon?: LucideIcon
    onRemove?: () => void
    removeLabel?: string
    children: ReactNode
    className?: string
}

const VARIANT: Record<ChipVariant, string> = {
    neutral:
        'bg-[color:var(--surface-sunken)] text-[color:var(--text-primary)]',
    accent: 'bg-boba-500/12 text-boba-700 dark:text-boba-300',
    success:
        'bg-[color:var(--status-open-bg)] text-[color:var(--status-open-fg)]',
    info: 'bg-[color:var(--status-closed-bg)] text-[color:var(--status-closed-fg)]',
    danger: 'bg-[color:var(--status-cancelled-bg)] text-[color:var(--status-cancelled-fg)]',
}

export function Chip({
    variant = 'neutral',
    leftIcon: LeftIcon,
    onRemove,
    removeLabel = 'Remove',
    children,
    className,
}: ChipProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5',
                'h-6 px-2.5 rounded-full',
                'text-[0.75rem] font-medium leading-none whitespace-nowrap',
                VARIANT[variant],
                className,
            )}
        >
            {LeftIcon && (
                <LeftIcon size={14} strokeWidth={1.75} aria-hidden="true" />
            )}
            <span>{children}</span>
            {onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label={removeLabel}
                    className={cn(
                        'inline-flex h-4 w-4 items-center justify-center',
                        'rounded-full opacity-70 hover:opacity-100',
                        'transition-opacity duration-150',
                    )}
                >
                    <X size={12} strokeWidth={2.5} aria-hidden="true" />
                </button>
            )}
        </span>
    )
}
