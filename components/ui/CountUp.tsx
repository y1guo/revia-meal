'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
    value: number
    /** Animation duration in ms. Default 700. */
    durationMs?: number
    /** Start delay before the animation begins. Default 0. */
    delayMs?: number
    /**
     * How to render the number at each tick. Defaults to 2 decimal places.
     * Pass the caller's own formatter to match surrounding static numbers.
     */
    format?: (n: number) => string
}

const defaultFormat = (n: number) => n.toFixed(2)

/**
 * Animates a number from 0 → value once on mount. Used for the winner-reveal
 * tally numbers on closed polls. Respects prefers-reduced-motion — shows the
 * final value immediately when set.
 */
export function CountUp({
    value,
    durationMs = 700,
    delayMs = 0,
    format = defaultFormat,
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

    return <>{format(display)}</>
}
