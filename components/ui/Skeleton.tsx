import { cn } from '@/lib/cn'

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

export function Skeleton({ className, ...rest }: SkeletonProps) {
    return (
        <div
            {...rest}
            aria-hidden="true"
            className={cn(
                'bg-[color:var(--surface-sunken)] rounded-[var(--radius-md)]',
                'animate-pulse motion-reduce:animate-none motion-reduce:opacity-60',
                className,
            )}
        />
    )
}
