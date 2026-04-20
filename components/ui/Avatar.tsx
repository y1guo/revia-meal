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

export function Avatar({
    name,
    email,
    imageUrl,
    size = 32,
    className,
}: AvatarProps) {
    const fontSize = Math.max(10, Math.round(size * 0.4))
    const initials = initialsOf(name, email)
    const baseClasses = cn(
        'inline-flex items-center justify-center shrink-0 overflow-hidden',
        'rounded-full',
        'bg-[color:var(--surface-sunken)]',
        'text-[color:var(--text-primary)]',
        'font-display font-medium leading-none',
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
    return (
        <span
            className={baseClasses}
            style={{ width: size, height: size, fontSize }}
            aria-hidden="true"
        >
            {initials}
        </span>
    )
}
