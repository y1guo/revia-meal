import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type EmptyStateProps = {
    title: string
    body?: ReactNode
    /** Lucide icon rendered inside a soft circular backdrop. */
    icon?: LucideIcon
    /** Full custom node. Overrides `icon` if both are passed. */
    illustration?: ReactNode
    action?: ReactNode
    className?: string
}

export function EmptyState({
    title,
    body,
    icon: Icon,
    illustration,
    action,
    className,
}: EmptyStateProps) {
    const visual =
        illustration ??
        (Icon ? (
            <div
                className={cn(
                    'flex items-center justify-center',
                    'h-20 w-20 rounded-full',
                    'bg-[color:var(--accent-brand)]/10',
                    'text-[color:var(--accent-brand)]',
                )}
            >
                <Icon size={36} strokeWidth={1.5} aria-hidden="true" />
            </div>
        ) : null)

    return (
        <div
            className={cn(
                'flex flex-col items-center text-center',
                'py-12 px-4 max-w-[360px] mx-auto',
                className,
            )}
        >
            {visual && (
                <div className="mb-6" aria-hidden="true">
                    {visual}
                </div>
            )}
            <h3 className="font-display font-medium text-[1.125rem] text-[color:var(--text-primary)] mb-2">
                {title}
            </h3>
            {body && (
                <p className="text-[0.875rem] text-[color:var(--text-secondary)] leading-relaxed">
                    {body}
                </p>
            )}
            {action && <div className="mt-6">{action}</div>}
        </div>
    )
}
