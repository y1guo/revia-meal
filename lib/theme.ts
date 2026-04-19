export type ThemePreference = 'light' | 'dark' | 'system'

export const THEME_COOKIE = 'revia-theme'

export function readThemeCookie(): ThemePreference {
    if (typeof document === 'undefined') return 'system'
    const match = document.cookie.match(
        new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`),
    )
    const value = match ? decodeURIComponent(match[1]) : 'system'
    return value === 'light' || value === 'dark' ? value : 'system'
}

export function writeThemeCookie(preference: ThemePreference): void {
    if (typeof document === 'undefined') return
    const oneYear = 60 * 60 * 24 * 365
    document.cookie = `${THEME_COOKIE}=${preference}; path=/; max-age=${oneYear}; samesite=lax`
}

export function resolveEffectiveTheme(
    preference: ThemePreference,
): 'light' | 'dark' {
    if (preference === 'light' || preference === 'dark') return preference
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
}

export function applyTheme(preference: ThemePreference): void {
    if (typeof document === 'undefined') return
    const effective = resolveEffectiveTheme(preference)
    document.documentElement.classList.toggle('dark', effective === 'dark')
}
