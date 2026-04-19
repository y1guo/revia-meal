'use client'

import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type TooltipProps = {
    content: ReactNode
    children: ReactNode
    side?: 'top' | 'right' | 'bottom' | 'left'
    align?: 'start' | 'center' | 'end'
    delayMs?: number
    asChild?: boolean
    className?: string
}

export function Tooltip({
    content,
    children,
    side = 'top',
    align = 'center',
    delayMs = 400,
    asChild = true,
    className,
}: TooltipProps) {
    return (
        <TooltipPrimitive.Provider delayDuration={delayMs}>
            <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild={asChild}>
                    {children}
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                        side={side}
                        align={align}
                        sideOffset={6}
                        className={cn(
                            'z-50 max-w-[280px]',
                            'bg-[color:var(--text-primary)] text-[color:var(--surface-base)]',
                            'px-2.5 py-1.5 rounded-[var(--radius-md)]',
                            'text-[0.75rem] leading-snug',
                            'shadow-[var(--shadow-card-hover)]',
                            className,
                        )}
                    >
                        {content}
                        <TooltipPrimitive.Arrow className="fill-[var(--text-primary)]" />
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    )
}
