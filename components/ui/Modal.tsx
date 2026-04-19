'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type ModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    children: ReactNode
    /**
     * When true, renders a close (×) button in the top-right. Destructive
     * confirm modals typically omit this and rely on Cancel only.
     */
    showClose?: boolean
    className?: string
}

export function Modal({
    open,
    onOpenChange,
    children,
    showClose = false,
    className,
}: ModalProps) {
    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay
                    className={cn(
                        'fixed inset-0 z-40',
                        'bg-[rgba(30,26,21,0.45)] backdrop-blur-[4px]',
                    )}
                />
                <DialogPrimitive.Content
                    className={cn(
                        'fixed left-1/2 top-1/2 z-50',
                        '-translate-x-1/2 -translate-y-1/2',
                        'w-[calc(100%-32px)] max-w-[480px]',
                        'bg-[color:var(--surface-raised)]',
                        'rounded-[var(--radius-lg)]',
                        'shadow-[var(--shadow-modal)]',
                        'p-6',
                        'focus:outline-none',
                        className,
                    )}
                >
                    {children}
                    {showClose && (
                        <DialogPrimitive.Close
                            aria-label="Close"
                            className={cn(
                                'absolute right-3 top-3',
                                'inline-flex h-8 w-8 items-center justify-center',
                                'rounded-[var(--radius-md)]',
                                'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]',
                                'hover:bg-[color:var(--surface-sunken)]',
                                'transition-colors duration-150',
                            )}
                        >
                            <X size={18} strokeWidth={1.75} aria-hidden="true" />
                        </DialogPrimitive.Close>
                    )}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    )
}

export function ModalIcon({
    tone = 'destructive',
    children,
    className,
}: {
    tone?: 'destructive' | 'info'
    children: ReactNode
    className?: string
}) {
    const toneStyles =
        tone === 'destructive'
            ? 'bg-tomato-500/12 text-tomato-500'
            : 'bg-indigo-500/12 text-indigo-500'
    return (
        <div
            className={cn(
                'mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full',
                toneStyles,
                className,
            )}
            aria-hidden="true"
        >
            {children}
        </div>
    )
}

export function ModalTitle({
    children,
    className,
}: {
    children: ReactNode
    className?: string
}) {
    return (
        <DialogPrimitive.Title
            className={cn(
                'font-display font-medium text-[1.25rem] leading-snug',
                'text-[color:var(--text-primary)]',
                'mb-2',
                className,
            )}
        >
            {children}
        </DialogPrimitive.Title>
    )
}

export function ModalTargetChip({
    children,
    className,
}: {
    children: ReactNode
    className?: string
}) {
    return (
        <div
            className={cn(
                'mb-4 inline-flex max-w-full items-center',
                'px-2.5 py-1 rounded-[var(--radius-pill)]',
                'bg-[color:var(--surface-sunken)]',
                'text-[0.8125rem] font-medium text-[color:var(--text-primary)]',
                'truncate',
                className,
            )}
        >
            {children}
        </div>
    )
}

export function ModalBody({
    children,
    className,
}: {
    children: ReactNode
    className?: string
}) {
    return (
        <DialogPrimitive.Description asChild>
            <div
                className={cn(
                    'text-[0.875rem] leading-relaxed',
                    'text-[color:var(--text-secondary)]',
                    'space-y-2',
                    className,
                )}
            >
                {children}
            </div>
        </DialogPrimitive.Description>
    )
}

export function ModalWarning({
    children,
    className,
}: {
    children: ReactNode
    className?: string
}) {
    return (
        <div
            className={cn(
                'mt-4 flex items-start gap-2',
                'px-3 py-2 rounded-[var(--radius-md)]',
                'border border-tomato-500/30 bg-tomato-500/5',
                'text-[0.8125rem] text-[color:var(--text-primary)]',
                className,
            )}
            role="note"
        >
            {children}
        </div>
    )
}

export function ModalFooter({
    children,
    className,
}: {
    children: ReactNode
    className?: string
}) {
    return (
        <div
            className={cn(
                'mt-6 flex items-center justify-end gap-2',
                className,
            )}
        >
            {children}
        </div>
    )
}

export const ModalClose = DialogPrimitive.Close
