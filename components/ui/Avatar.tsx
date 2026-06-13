import { cn } from '@/lib/cn'

type AvatarProps = {
    name?: string | null
    email?: string | null
    /** Optional profile picture URL (e.g. Google OAuth avatar). */
    imageUrl?: string | null
    size?: number
    className?: string
}

/**
 * Derive 1-2 character initials from a display name or email.
 * "Alice Chen" → "AC", "Yi Guo (Personal)" → "YG" (parens stripped),
 * "alice.chen@foo.com" → "AC", "bob@foo.com" → "B".
 */
export function initialsOf(
    name?: string | null,
    email?: string | null,
): string {
    const fromName = (raw: string): string | null => {
        // Drop anything in parens (e.g. "Yi Guo (Personal)" → "Yi Guo").
        const cleaned = raw.replace(/\([^)]*\)/g, '').trim()
        const parts = cleaned
            .split(/\s+/)
            .filter((p) => /^[\p{L}]/u.test(p))
        if (parts.length === 0) return null
        if (parts.length === 1) return parts[0][0].toUpperCase()
        const first = parts[0][0]
        const last = parts[parts.length - 1][0]
        return (first + last).toUpperCase()
    }
    const fromEmail = (raw: string): string | null => {
        const local = raw.split('@')[0] ?? ''
        const parts = local.split(/[._-]+/).filter(Boolean)
        if (parts.length === 0) return null
        if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? null
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    const name2 = name?.trim() ? fromName(name.trim()) : null
    if (name2) return name2
    const email2 = email?.trim() ? fromEmail(email.trim()) : null
    if (email2) return email2
    return '?'
}

// Vivid full-spectrum trim set for fallback avatars (violet / cyan / emerald /
// amber / rose / orange / indigo / fuchsia), matching the reference palette.
// Bright bg + dark ink keeps initials readable.
const AVATAR_PALETTE = [
    { bg: '#A78BFA', fg: '#271046' }, // violet
    { bg: '#22D3EE', fg: '#0C2E39' }, // cyan
    { bg: '#34D399', fg: '#043528' }, // emerald
    { bg: '#FBBF24', fg: '#3A2606' }, // amber
    { bg: '#FB7185', fg: '#4C0519' }, // rose
    { bg: '#FB923C', fg: '#431407' }, // orange
    { bg: '#818CF8', fg: '#1E1B4B' }, // indigo
    { bg: '#F0ABFC', fg: '#4A044E' }, // fuchsia
] as const

function hashString(s: string): number {
    let h = 0
    for (let i = 0; i < s.length; i++) {
        h = (h << 5) - h + s.charCodeAt(i)
        h |= 0
    }
    return h
}

function fallbackColor(key: string): (typeof AVATAR_PALETTE)[number] {
    const idx = Math.abs(hashString(key)) % AVATAR_PALETTE.length
    return AVATAR_PALETTE[idx]
}

export function Avatar({
    name,
    email,
    imageUrl,
    size = 32,
    className,
}: AvatarProps) {
    // Slightly smaller than 0.45 so 2-letter initials fit without touching the edge.
    const fontSize = Math.max(10, Math.round(size * 0.4))
    const initials = initialsOf(name, email)
    const baseClasses = cn(
        'inline-flex items-center justify-center shrink-0 overflow-hidden',
        'rounded-full',
        'font-display font-medium leading-none tracking-tight',
        'select-none',
        className,
    )
    if (imageUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={imageUrl}
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
                className={baseClasses}
                style={{ width: size, height: size, objectFit: 'cover' }}
            />
        )
    }
    const { bg, fg } = fallbackColor(name || email || '?')
    return (
        <span
            className={baseClasses}
            style={{
                width: size,
                height: size,
                fontSize,
                backgroundColor: bg,
                color: fg,
            }}
            aria-hidden="true"
        >
            {initials}
        </span>
    )
}
