'use client'

import { useEffect } from 'react'
import { applyTheme, readThemeCookie } from '@/lib/theme'

/**
 * When the user's preference is "system", re-apply the theme class whenever
 * the OS color-scheme changes. The pre-hydration script sets the class on
 * first paint; this component keeps it in sync afterward.
 */
export function ThemeSync() {
    useEffect(() => {
        // Re-apply on mount in case the pre-hydration script was skipped
        // or the cookie changed in another tab since last render.
        applyTheme(readThemeCookie())

        const media = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = () => {
            if (readThemeCookie() === 'system') {
                applyTheme('system')
            }
        }
        media.addEventListener('change', handler)
        return () => media.removeEventListener('change', handler)
    }, [])

    return null
}
