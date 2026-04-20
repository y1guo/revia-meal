'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSyncExternalStore, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

// `history.length > 1` means this tab has at least one prior entry to go
// back to — covers both same-origin SPA navigations (Link click) and prior
// full-page loads. `document.referrer` is not reliable here because it does
// not update on client-side navigations. useSyncExternalStore gives us a
// clean SSR seam without triggering the React 19 "setState inside effect"
// lint rule.
function subscribe() {
    return () => {}
}

function getSnapshot(): boolean {
    return window.history.length > 1
}

function getServerSnapshot(): boolean {
    return false
}

type SmartBackLinkProps = {
    fallbackHref: string
    children: ReactNode
    className?: string
}

/**
 * Back affordance that prefers `router.back()` when same-origin history
 * exists. Falls back to a soft navigation to `fallbackHref` when the user
 * arrived via a deep link, refresh, or cross-origin referrer — so the
 * control is never a dead end.
 */
export function SmartBackLink({
    fallbackHref,
    children,
    className,
}: SmartBackLinkProps) {
    const router = useRouter()
    const canGoBack = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot,
    )

    return (
        <Link
            href={fallbackHref}
            onClick={(e) => {
                if (canGoBack) {
                    e.preventDefault()
                    router.back()
                }
            }}
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
