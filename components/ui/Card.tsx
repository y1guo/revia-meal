import { cn } from '@/lib/cn'

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
    interactive?: boolean
}

export function Card({ className, interactive, ...rest }: CardProps) {
    return (
        <div
            {...rest}
            className={cn(
                'bg-[color:var(--surface-raised)]',
                'border border-[color:var(--border-subtle)]',
                'rounded-[var(--radius-lg)] shadow-[var(--shadow-card-rest)]',
                'p-4 md:p-5',
                interactive &&
                    'transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] motion-reduce:hover:translate-y-0',
                className,
            )}
        />
    )
}

export function CardHeader({
    className,
    ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            {...rest}
            className={cn(
                'flex items-start justify-between gap-2 mb-3',
                className,
            )}
        />
    )
}

export function CardBody({
    className,
    ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
    return <div {...rest} className={cn('space-y-2', className)} />
}

export function CardFooter({
    className,
    ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            {...rest}
            className={cn(
                'mt-4 pt-3 border-t border-[color:var(--border-subtle)]',
                'flex items-center justify-end gap-2',
                className,
            )}
        />
    )
}
