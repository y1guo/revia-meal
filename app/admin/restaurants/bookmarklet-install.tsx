'use client'

import { Bookmark } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BOOKMARKLET_SOURCE } from '@/lib/bookmarklet/source'
import { Card } from '@/components/ui/Card'
import { buttonClasses, buttonIconSize } from '@/components/ui/Button'

export function BookmarkletInstall() {
    const anchorRef = useRef<HTMLAnchorElement>(null)
    const [installed, setInstalled] = useState(false)

    useEffect(() => {
        const el = anchorRef.current
        if (!el) return
        // React strips `javascript:` URLs set through the JSX href prop as an XSS guard.
        // Set it imperatively once the element is mounted — this is the standard
        // bookmarklet-install pattern.
        const src = BOOKMARKLET_SOURCE.replace(
            '${REVIA_ORIGIN}',
            window.location.origin,
        )
        el.setAttribute('href', 'javascript:' + src)
        setInstalled(true)
    }, [])

    return (
        <Card className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
            <div className="flex-1 space-y-1.5">
                <h2 className="font-display font-medium text-[1rem] text-[color:var(--text-primary)]">
                    Import from DoorDash
                </h2>
                <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
                    Drag the button to your bookmarks bar, then click it from
                    any DoorDash restaurant page.
                </p>
                <p className="text-[0.75rem] text-[color:var(--text-tertiary)]">
                    <strong className="font-medium text-[color:var(--text-secondary)]">
                        Sign out of DoorDash first
                    </strong>{' '}
                    (or use an incognito window). DoorDash strips the menu and
                    cuisine data from signed-in pages; the bookmarklet cannot
                    import from them.
                </p>
            </div>
            <a
                ref={anchorRef}
                draggable="true"
                aria-label="Add to revia-meal bookmarklet — drag to bookmarks bar"
                onClick={(e) => {
                    e.preventDefault()
                    alert(
                        'Drag this button to your bookmarks bar to install. Then click it from a DoorDash restaurant page.',
                    )
                }}
                className={buttonClasses({ variant: 'primary', size: 'md' })}
                style={installed ? undefined : { pointerEvents: 'none', opacity: 0.6 }}
            >
                <Bookmark
                    size={buttonIconSize('md')}
                    strokeWidth={1.75}
                    aria-hidden="true"
                />
                <span>Add to revia-meal</span>
            </a>
        </Card>
    )
}
