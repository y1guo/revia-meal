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
