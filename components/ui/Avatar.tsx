import { cn } from '@/lib/cn'

type AvatarProps = {
    name?: string | null
    email?: string | null
    size?: number
    className?: string
}

function initialOf(name?: string | null, email?: string | null): string {
    const source = name?.trim() || email?.trim() || '?'
    const ch = source[0]
    return ch ? ch.toUpperCase() : '?'
}

export function Avatar({ name, email, size = 32, className }: AvatarProps) {
    const fontSize = Math.max(10, Math.round(size * 0.45))
    return (
        <span
            className={cn(
                'inline-flex items-center justify-center shrink-0',
                'rounded-full',
                'bg-[color:var(--surface-sunken)]',
                'text-[color:var(--text-primary)]',
                'font-display font-medium leading-none',
                'select-none',
                className,
            )}
            style={{ width: size, height: size, fontSize }}
            aria-hidden="true"
        >
            {initialOf(name, email)}
        </span>
    )
}
