# Plan — Context-aware back button on poll pages

Implements [back-button.md](./back-button.md).

## Changes

**New**
- `components/ui/SmartBackLink.tsx` — client component that prefers `router.back()` when same-origin history is present, falls back to a provided `href`. Shares visual styling with `BackLink`.

**Modified**
- `app/polls/[id]/page.tsx` — swap `BackLink` import + element for `SmartBackLink`, label becomes `Back`, `fallbackHref="/"`.

Admin detail pages are unchanged.

## Component

```tsx
'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Props = { fallbackHref: string; children: ReactNode; className?: string }

export function SmartBackLink({ fallbackHref, children, className }: Props) {
    const router = useRouter()
    const [canGoBack, setCanGoBack] = useState(false)

    useEffect(() => {
        const ref = document.referrer
        if (!ref) return
        try {
            const u = new URL(ref)
            if (u.origin === window.location.origin) setCanGoBack(true)
        } catch {
            /* malformed referrer, treat as no history */
        }
    }, [])

    return (
        <Link
            href={fallbackHref}
            onClick={(e) => {
                if (canGoBack) {
                    e.preventDefault()
                    router.back()
                }
            }}
            className={/* same classes as BackLink */}
        >
            <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" className="transition-transform duration-150 group-hover:-translate-x-0.5 motion-reduce:group-hover:translate-x-0" />
            <span>{children}</span>
        </Link>
    )
}
```

Styling is lifted verbatim from [BackLink.tsx](../../components/ui/BackLink.tsx). The group-based hover animation still works because we render an `<a>` just like `BackLink` does.

## Test plan

**Type-check + lint.**

**Playwright MCP:**

1. Navigate `/ → click a poll card → /polls/:id` renders with "Back" button. Click → land on `/` (router.back).
2. Navigate `/history → click a poll row → /polls/:id` renders with "Back". Click → land on `/history`, preserving filter state.
3. Direct-navigate to `/polls/:id` in a fresh tab / incognito. Click Back → land on `/` via the Link fallback.

## Rollback

Delete `SmartBackLink.tsx`; revert the one-line import + element change in `app/polls/[id]/page.tsx`.
