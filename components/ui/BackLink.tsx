import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type BackLinkProps = {
    href: string
    children: ReactNode
    className?: string
}

/**
 * Compact pill-shaped back-navigation link. Rendered above a PageHeader to
 * return to an index view. Default mb-3 pairs with PageHeader's own spacing.
 */
export function BackLink({ href, children, className }: BackLinkProps) {
    return (
        <Link
            href={href}
            className={cn(
                'group inline-flex items-center gap-1.5',
                'h-8 px-3 rounded-full',
                'text-[0.8125rem] font-medium leading-none',
                'bg-[color:var(--surface-raised)] text-[color:var(--text-secondary)]',
                'border border-[color:var(--border-subtle)]',
                'hover:bg-[color:var(--surface-sunken)] hover:text-[color:var(--text-primary)]',
                'transition-colors duration-150',
                'mb-3',
                className,
            )}
        >
            <ArrowLeft
                size={14}
                strokeWidth={1.75}
                aria-hidden="true"
                className="transition-transform duration-150 group-hover:-translate-x-0.5 motion-reduce:group-hover:translate-x-0"
            />
            <span>{children}</span>
        </Link>
    )
}
