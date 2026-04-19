import { cn } from '@/lib/cn'

export type TextInputSize = 'sm' | 'md' | 'lg'

type TextInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
    size?: TextInputSize
    error?: boolean
}

const SIZE: Record<TextInputSize, string> = {
    sm: 'h-8 text-[0.8125rem] px-2.5',
    md: 'h-10 text-[0.875rem] px-3',
    lg: 'h-12 text-[1rem] px-4',
}

export function TextInput({
    size = 'md',
    error,
    className,
    type = 'text',
    ...rest
}: TextInputProps) {
    return (
        <input
            {...rest}
            type={type}
            aria-invalid={error || undefined}
            className={cn(
                'block w-full',
                'bg-[color:var(--surface-raised)]',
                'border rounded-[var(--radius-md)]',
                'text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)]',
                'focus:outline-none focus-visible:border-[color:var(--accent-brand)]',
                'transition-colors duration-150',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                error
                    ? 'border-tomato-500'
                    : 'border-[color:var(--border-subtle)]',
                SIZE[size],
                className,
            )}
        />
    )
}
