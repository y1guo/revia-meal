'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
    value: number
    /** Animation duration in ms. Default 700. */
    durationMs?: number
    /** Start delay before the animation begins. Default 0. */
    delayMs?: number
    /**
     * Number formatting. "trim" (default) shows up to 2 decimals and drops
     * trailing zeros ("2.5", "2"). "fixed2" always shows 2 decimals ("2.50").
     * A string identifier instead of a function keeps this component
     * server-renderable from RSC props.
     */
    format?: 'trim' | 'fixed2'
}

function formatNumber(n: number, mode: 'trim' | 'fixed2'): string {
    const s = n.toFixed(2)
    return mode === 'fixed2' ? s : s.replace(/\.?0+$/, '')
}

/**
 * Animates a number from 0 → value once on mount. Used for the winner-reveal
 * tally numbers on closed polls. Respects prefers-reduced-motion — shows the
 * final value immediately when set.
 */
export function CountUp({
    value,
    durationMs = 700,
    delayMs = 0,
    format = 'trim',
}: Props) {
    const [display, setDisplay] = useState(0)
    const rafRef = useRef<number | null>(null)

    useEffect(() => {
        const reduced =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (reduced || value === 0) {
            setDisplay(value)
            return
        }

        let start = 0
        const timeout = window.setTimeout(() => {
            const step = (ts: number) => {
                if (!start) start = ts
                const elapsed = ts - start
                const t = Math.min(1, elapsed / durationMs)
                // ease-out quart
                const eased = 1 - Math.pow(1 - t, 4)
                setDisplay(value * eased)
                if (t < 1) {
                    rafRef.current = requestAnimationFrame(step)
                }
            }
            rafRef.current = requestAnimationFrame(step)
        }, delayMs)

        return () => {
            window.clearTimeout(timeout)
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
        }
    }, [value, durationMs, delayMs])

    return <>{formatNumber(display, format)}</>
}
