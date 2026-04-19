import {
    Ban,
    Calendar,
    Flag,
    ListChecks,
    Loader2,
    ShieldOff,
    type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'

export type StatusVariant =
    | 'scheduled'
    | 'open'
    | 'pending_close'
    | 'closed'
    | 'cancelled'
    | 'revoked'

const VARIANT_STYLE: Record<StatusVariant, string> = {
    scheduled:
        'bg-[color:var(--status-scheduled-bg)] text-[color:var(--status-scheduled-fg)]',
    open: 'bg-[color:var(--status-open-bg)] text-[color:var(--status-open-fg)]',
    pending_close:
        'bg-[color:var(--status-pending-bg)] text-[color:var(--status-pending-fg)]',
    closed: 'bg-[color:var(--status-closed-bg)] text-[color:var(--status-closed-fg)]',
    cancelled:
        'bg-[color:var(--status-cancelled-bg)] text-[color:var(--status-cancelled-fg)]',
    revoked:
        'bg-[color:var(--surface-sunken)] text-[color:var(--text-secondary)]',
}

const VARIANT_ICON: Record<StatusVariant, LucideIcon> = {
    scheduled: Calendar,
    open: ListChecks,
    pending_close: Loader2,
    closed: Flag,
    cancelled: Ban,
    revoked: ShieldOff,
}

const VARIANT_LABEL: Record<StatusVariant, string> = {
    scheduled: 'Scheduled',
    open: 'Open',
    pending_close: 'Pending close',
    closed: 'Closed',
    cancelled: 'Cancelled',
    revoked: 'Revoked',
}

export function StatusBadge({
    status,
    className,
}: {
    status: StatusVariant
    className?: string
}) {
    const Icon = VARIANT_ICON[status]
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 h-[22px] px-2.5',
                'rounded-full text-[0.75rem] font-medium leading-none whitespace-nowrap',
                VARIANT_STYLE[status],
                className,
            )}
        >
            <Icon
                size={12}
                strokeWidth={2}
                aria-hidden="true"
                className={cn(
                    status === 'pending_close' &&
                        'animate-spin motion-reduce:animate-none',
                )}
            />
            <span>{VARIANT_LABEL[status]}</span>
        </span>
    )
}
