'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreHorizontal, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type RowActionsMenuProps = {
    children: ReactNode
    /** Accessible label for the trigger button. */
    label?: string
    align?: 'start' | 'end'
}

export function RowActionsMenu({
    children,
    label = 'Row actions',
    align = 'end',
}: RowActionsMenuProps) {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger
                aria-label={label}
                className={cn(
                    'inline-flex h-8 w-8 items-center justify-center',
                    'rounded-full',
                    'text-[color:var(--text-secondary)]',
                    'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                    'data-[state=open]:opacity-100 data-[state=open]:bg-[color:var(--surface-sunken)]',
                    'hover:bg-[color:var(--surface-sunken)] hover:text-[color:var(--text-primary)]',
                    'transition-[opacity,background-color,color] duration-150',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-brand)]',
                )}
            >
                <MoreHorizontal
                    size={16}
                    strokeWidth={1.75}
                    aria-hidden="true"
                />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    align={align}
                    sideOffset={4}
                    className={cn(
                        'z-50 min-w-[180px] p-1',
                        'bg-[color:var(--surface-raised)]',
                        'border border-[color:var(--border-subtle)]',
                        'rounded-[var(--radius-md)]',
                        'shadow-[var(--shadow-card-hover)]',
                    )}
                >
                    {children}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    )
}

type RowActionItemProps = {
    icon?: LucideIcon
    onSelect?: () => void
    tone?: 'default' | 'destructive'
    disabled?: boolean
    children: ReactNode
}

export function RowActionItem({
    icon: Icon,
    onSelect,
    tone = 'default',
    disabled,
    children,
}: RowActionItemProps) {
    return (
        <DropdownMenu.Item
            disabled={disabled}
            onSelect={(e) => {
                if (disabled) return
                e.preventDefault()
                onSelect?.()
            }}
            className={cn(
                'flex items-center gap-2',
                'px-2 py-1.5 rounded-[var(--radius-sm)]',
                'text-[0.875rem] cursor-pointer outline-none',
                'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
                tone === 'destructive'
                    ? 'text-danger-700 dark:text-danger-400 data-[highlighted]:bg-danger-500/10'
                    : 'text-[color:var(--text-primary)] data-[highlighted]:bg-[color:var(--surface-sunken)]',
            )}
        >
            {Icon && (
                <Icon
                    size={14}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className={cn(
                        tone === 'destructive'
                            ? 'text-danger-700 dark:text-danger-400'
                            : 'text-[color:var(--text-secondary)]',
                    )}
                />
            )}
            <span>{children}</span>
        </DropdownMenu.Item>
    )
}

export const RowActionSeparator = function () {
    return (
        <DropdownMenu.Separator className="my-1 h-px bg-[color:var(--border-subtle)]" />
    )
}
