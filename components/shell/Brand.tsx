import Link from 'next/link'
import { cn } from '@/lib/cn'

type BrandProps = {
    href?: string
    className?: string
}

/**
 * HeyRevia icon + "meal" wordmark. The icon is the company mark; "meal" is
 * Fraunces, identifying the app.
 */
export function Brand({ href = '/', className }: BrandProps) {
    return (
        <Link
            href={href}
            className={cn(
                'inline-flex items-center gap-2',
                'font-display font-semibold tracking-tight',
                'text-[1.125rem] md:text-[1.25rem]',
                'text-[color:var(--text-primary)]',
                className,
            )}
            aria-label="HeyRevia meal — home"
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/brand/icon.png"
                alt=""
                aria-hidden="true"
                width={28}
                height={27}
                className="h-7 w-auto"
            />
            <span>meal</span>
        </Link>
    )
}
