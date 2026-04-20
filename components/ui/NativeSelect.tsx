import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type NativeSelectSize = 'sm' | 'md'

type NativeSelectProps = Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    'size'
> & {
    size?: NativeSelectSize
    invalid?: boolean
}

const SIZE: Record<NativeSelectSize, string> = {
    sm: 'h-8 text-[0.8125rem] pl-2.5 pr-7',
    md: 'h-9 text-[0.875rem] pl-3 pr-8',
}

const CHEVRON_OFFSET: Record<NativeSelectSize, string> = {
    sm: 'right-2',
    md: 'right-2.5',
}

/**
 * Styled native <select>. Used where we need an empty-string "unset" value in
 * a GET-form submission (Radix Select reserves empty strings).
 */
export function NativeSelect({
    size = 'md',
    invalid,
    className,
    ...rest
}: NativeSelectProps) {
    return (
        <span className="relative inline-flex w-full">
            <select
                {...rest}
                className={cn(
                    'appearance-none w-full cursor-pointer',
                    'rounded-[var(--radius-md)]',
                    'bg-[color:var(--surface-raised)]',
                    'border',
                    invalid
                        ? 'border-danger-500'
                        : 'border-[color:var(--border-subtle)]',
                    'text-[color:var(--text-primary)]',
                    'transition-colors duration-150',
                    'hover:border-[color:var(--text-secondary)]',
                    'focus:outline-none focus-visible:border-[color:var(--accent-brand)]',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    SIZE[size],
                    className,
                )}
            />
            <ChevronDown
                size={16}
                strokeWidth={1.75}
                aria-hidden="true"
                className={cn(
                    'pointer-events-none absolute top-1/2 -translate-y-1/2',
                    'text-[color:var(--text-secondary)]',
                    CHEVRON_OFFSET[size],
                )}
            />
        </span>
    )
}
