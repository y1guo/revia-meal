import Link from 'next/link'
import { cn } from '@/lib/cn'

type BrandProps = {
    href?: string
    className?: string
}

/**
 * "revia · meal" wordmark. The middle separator is a saffron-filled circle —
 * a placeholder plate glyph per [direction.md §13](../../docs/design/direction.md).
 */
export function Brand({ href = '/', className }: BrandProps) {
    return (
        <Link
            href={href}
            className={cn(
                'inline-flex items-center gap-1.5',
                'font-display font-semibold tracking-tight',
                'text-[1.125rem] md:text-[1.25rem]',
                'text-[color:var(--text-primary)]',
                className,
            )}
            aria-label="revia meal — home"
        >
            <span>revia</span>
            <span
                className="inline-block h-2 w-2 rounded-full bg-[color:var(--accent-brand)]"
                aria-hidden="true"
            />
            <span>meal</span>
        </Link>
    )
}
