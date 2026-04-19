import { Children, cloneElement, isValidElement, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type FormFieldProps = {
    id: string
    label: string
    help?: ReactNode
    error?: string
    required?: boolean
    className?: string
    children: ReactNode
}

export function FormField({
    id,
    label,
    help,
    error,
    required,
    className,
    children,
}: FormFieldProps) {
    const helpId = help ? `${id}-help` : undefined
    const errorId = error ? `${id}-error` : undefined
    const describedBy =
        [helpId, errorId].filter(Boolean).join(' ') || undefined

    const enhanced = Children.map(children, (child) => {
        if (!isValidElement(child)) return child
        const childProps = child.props as Record<string, unknown>
        return cloneElement(child as React.ReactElement<Record<string, unknown>>, {
            id: (childProps.id as string | undefined) ?? id,
            'aria-describedby':
                (childProps['aria-describedby'] as string | undefined) ??
                describedBy,
            'aria-invalid': error ? true : childProps['aria-invalid'],
            'aria-required': required ? true : childProps['aria-required'],
            ...(error ? { error: true } : {}),
        })
    })

    return (
        <div className={cn('space-y-1.5', className)}>
            <label
                htmlFor={id}
                className="block text-[0.875rem] font-medium text-[color:var(--text-primary)]"
            >
                {label}
                {required && (
                    <span
                        className="text-[color:var(--accent-brand)] ml-0.5"
                        aria-hidden="true"
                    >
                        *
                    </span>
                )}
            </label>
            {enhanced}
            {help && !error && (
                <p
                    id={helpId}
                    className="text-[0.8125rem] text-[color:var(--text-secondary)]"
                >
                    {help}
                </p>
            )}
            {error && (
                <p
                    id={errorId}
                    role="alert"
                    className="text-[0.8125rem] text-danger-700 dark:text-danger-400"
                >
                    {error}
                </p>
            )}
        </div>
    )
}
