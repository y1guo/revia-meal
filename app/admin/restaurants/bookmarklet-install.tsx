'use client'

import { Bookmark } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { BOOKMARKLET_SOURCE } from '@/lib/bookmarklet/source'
import { BOOKMARKLET_SOURCE_BETA } from '@/lib/bookmarklet/source-beta'
import { Card } from '@/components/ui/Card'
import {
    buttonClasses,
    buttonIconSize,
    type ButtonVariant,
} from '@/components/ui/Button'

// Anchors start disabled and are enabled imperatively once their `javascript:`
// href is set (see the effect), so a button can't be dragged with an empty href.
const DISABLED_STYLE: React.CSSProperties = {
    pointerEvents: 'none',
    opacity: 0.6,
}

export function BookmarkletInstall() {
    const stableRef = useRef<HTMLAnchorElement>(null)
    const betaRef = useRef<HTMLAnchorElement>(null)

    useEffect(() => {
        // React strips `javascript:` URLs set through the JSX href prop as an XSS
        // guard. Set them imperatively once mounted — the standard bookmarklet
        // pattern. `${REVIA_ORIGIN}` is a literal placeholder substituted here so
        // the same source ships a dev or prod bookmarklet by where it's dragged from.
        // The anchors render disabled (see DISABLED_STYLE) until their href is set,
        // so the button can't be dragged with an empty href before hydration; we
        // clear that styling here rather than via React state.
        const origin = window.location.origin
        const wire = (el: HTMLAnchorElement | null, src: string) => {
            if (!el) return
            el.setAttribute(
                'href',
                'javascript:' + src.replace('${REVIA_ORIGIN}', origin),
            )
            el.style.pointerEvents = ''
            el.style.opacity = ''
        }
        wire(stableRef.current, BOOKMARKLET_SOURCE)
        wire(betaRef.current, BOOKMARKLET_SOURCE_BETA)
    }, [])

    const renderButton = (
        ref: React.Ref<HTMLAnchorElement>,
        label: string,
        variant: ButtonVariant,
    ) => (
        <a
            ref={ref}
            draggable="true"
            aria-label={`${label} bookmarklet — drag to bookmarks bar`}
            onClick={(e) => {
                e.preventDefault()
                alert(
                    'Drag this button to your bookmarks bar to install. Then click it from a DoorDash restaurant page.',
                )
            }}
            className={buttonClasses({ variant, size: 'md' })}
            style={DISABLED_STYLE}
        >
            <Bookmark
                size={buttonIconSize('md')}
                strokeWidth={1.75}
                aria-hidden="true"
            />
            <span>{label}</span>
        </a>
    )

    return (
        <Card className="flex flex-col gap-3 md:flex-row md:items-start md:gap-5">
            <div className="flex-1 space-y-1.5">
                <h2 className="font-display font-medium text-[1rem] text-[color:var(--text-primary)]">
                    Import from DoorDash
                </h2>
                <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
                    Drag a button to your bookmarks bar, then click it from any
                    DoorDash restaurant page.
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
            <div className="flex flex-col gap-2 md:items-end md:text-right">
                {renderButton(stableRef, 'Add to revia-meal', 'primary')}
                {renderButton(
                    betaRef,
                    'Add to revia-meal (beta)',
                    'secondary',
                )}
                <p className="max-w-[16rem] text-[0.6875rem] text-[color:var(--text-tertiary)]">
                    Beta also imports stores that the main button rejects with a
                    “sign out” error. Same review page — try it if the main one
                    fails.
                </p>
            </div>
        </Card>
    )
}
