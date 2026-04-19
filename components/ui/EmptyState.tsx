import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type EmptyStateProps = {
    title: string
    body?: ReactNode
    illustration?: ReactNode
    action?: ReactNode
    className?: string
}

export function EmptyState({
    title,
    body,
    illustration,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center text-center',
                'py-12 px-4 max-w-[360px] mx-auto',
                className,
            )}
        >
            {illustration && (
                <div className="mb-6" aria-hidden="true">
                    {illustration}
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
