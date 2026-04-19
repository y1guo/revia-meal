import { Loader2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'ghost'
    | 'ghost-destructive'
    | 'destructive'
    | 'link'

export type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = {
    variant?: ButtonVariant
    size?: ButtonSize
    loading?: boolean
    leftIcon?: LucideIcon
    rightIcon?: LucideIcon
} & React.ButtonHTMLAttributes<HTMLButtonElement>

const VARIANT: Record<ButtonVariant, string> = {
    primary:
        'bg-[color:var(--accent-brand)] text-[color:var(--text-on-accent)] hover:bg-[color:var(--accent-brand-hover)]',
    secondary:
        'bg-[color:var(--surface-raised)] text-[color:var(--text-primary)] border border-[color:var(--border-subtle)] hover:bg-[color:var(--surface-sunken)]',
    ghost: 'text-[color:var(--text-primary)] hover:bg-[color:var(--surface-raised)]',
    'ghost-destructive':
        'text-tomato-500 hover:bg-tomato-500/10 hover:text-tomato-500',
    destructive: 'bg-tomato-500 text-white hover:bg-tomato-500/90',
    link: 'text-[color:var(--accent-brand)] underline underline-offset-2 decoration-1 hover:decoration-2',
}

const SIZE: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-[0.8125rem] gap-1.5',
    md: 'h-10 px-4 text-[0.875rem] gap-2',
    lg: 'h-12 px-6 text-[1rem] gap-2',
}

const ICON_SIZE: Record<ButtonSize, number> = {
    sm: 14,
    md: 16,
    lg: 18,
}

export function Button({
    variant = 'secondary',
    size = 'md',
    loading = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
}: ButtonProps) {
    const iconSize = ICON_SIZE[size]
    const isDisabled = disabled || loading
    return (
        <button
            {...rest}
            type={type}
            disabled={isDisabled}
            aria-busy={loading || undefined}
            className={cn(
                'inline-flex items-center justify-center',
                'rounded-[var(--radius-md)] font-medium leading-none whitespace-nowrap',
                'transition-colors duration-150',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'active:translate-y-px motion-reduce:active:translate-y-0',
                VARIANT[variant],
                SIZE[size],
                className,
            )}
        >
            {loading ? (
                <Loader2
                    size={iconSize}
                    strokeWidth={1.75}
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                />
            ) : LeftIcon ? (
                <LeftIcon
                    size={iconSize}
                    strokeWidth={1.75}
                    aria-hidden="true"
                />
            ) : null}
            {children != null && <span>{children}</span>}
            {!loading && RightIcon ? (
                <RightIcon
                    size={iconSize}
                    strokeWidth={1.75}
                    aria-hidden="true"
                />
            ) : null}
        </button>
    )
}
