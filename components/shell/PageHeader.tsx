import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type PageHeaderProps = {
    title: ReactNode
    subtitle?: ReactNode
    action?: ReactNode
    className?: string
}

export function PageHeader({
    title,
    subtitle,
    action,
    className,
}: PageHeaderProps) {
    return (
        <div
            className={cn(
                'flex flex-col gap-2 md:flex-row md:items-start md:justify-between',
                'mb-6',
                className,
            )}
        >
            <div className="space-y-1">
                <h1 className="font-display font-semibold tracking-tight text-[1.25rem] md:text-[1.5rem] text-[color:var(--text-primary)]">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
                        {subtitle}
                    </p>
                )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    )
}
