import { cn } from '@/lib/cn'

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    error?: boolean
}

export function Textarea({
    error,
    className,
    rows = 3,
    ...rest
}: TextareaProps) {
    return (
        <textarea
            {...rest}
            rows={rows}
            aria-invalid={error || undefined}
            className={cn(
                'block w-full',
                'bg-[color:var(--surface-raised)]',
                'border rounded-[var(--radius-md)]',
                'text-[0.875rem] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)]',
                'px-3 py-2 resize-none',
                '[field-sizing:content] [max-height:16rem]',
                'focus:outline-none focus-visible:border-[color:var(--accent-brand)]',
                'transition-colors duration-150',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                error
                    ? 'border-danger-500'
                    : 'border-[color:var(--border-subtle)]',
                className,
            )}
        />
    )
}
