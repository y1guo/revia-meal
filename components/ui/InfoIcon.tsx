'use client'

import Link from 'next/link'
import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Tooltip } from './Tooltip'

type InfoIconProps = {
    label: string
    children: ReactNode
    learnMoreHref?: string
    className?: string
}

export function InfoIcon({
    label,
    children,
    learnMoreHref,
    className,
}: InfoIconProps) {
    return (
        <Tooltip
            content={
                <div className="space-y-1">
                    <div>{children}</div>
                    {learnMoreHref && (
                        <Link
                            href={learnMoreHref}
                            className="text-[color:var(--accent-brand)] underline underline-offset-2"
                        >
                            Learn more →
                        </Link>
                    )}
                </div>
            }
        >
            <button
                type="button"
                aria-label={label}
                className={cn(
                    'inline-flex items-center justify-center',
                    'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]',
                    'transition-colors duration-150',
                    className,
                )}
            >
                <Info size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
        </Tooltip>
    )
}
