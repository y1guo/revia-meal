import Link from 'next/link'
import { cn } from '@/lib/cn'

type BrandProps = {
    href?: string
    className?: string
}

/**
 * HeyRevia wordmark + "Meal" app label. The wordmark PNG ships white-on-
 * transparent; we invert brightness in light mode so it reads on cream, and
 * leave it as-is in dark mode.
 */
export function Brand({ href = '/', className }: BrandProps) {
    return (
        <Link
            href={href}
            className={cn(
                'inline-flex items-center gap-3',
                'text-[color:var(--text-primary)]',
                className,
            )}
            aria-label="HeyRevia Meal — home"
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/brand/wordmark.png"
                alt="HeyRevia"
                width={120}
                height={36}
                className="h-[26px] w-auto brightness-0 dark:brightness-100"
            />
            <span
                aria-hidden="true"
                className="h-5 w-px bg-[color:var(--border-subtle)]"
            />
            <span className="font-display font-semibold tracking-tight text-[1.125rem] md:text-[1.25rem]">
                Meal
            </span>
        </Link>
    )
}
