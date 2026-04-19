'use client'

import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/cn'

type CheckboxProps = React.ComponentPropsWithoutRef<
    typeof CheckboxPrimitive.Root
>

export function Checkbox({ className, ...rest }: CheckboxProps) {
    return (
        <CheckboxPrimitive.Root
            {...rest}
            className={cn(
                'inline-flex items-center justify-center shrink-0',
                'h-[18px] w-[18px] rounded-[4px]',
                'border-[1.5px] border-[color:var(--border-strong)]',
                'bg-[color:var(--surface-base)]',
                'transition-colors duration-150',
                'data-[state=checked]:bg-[color:var(--accent-brand)] data-[state=checked]:border-[color:var(--accent-brand)]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                className,
            )}
        >
            <CheckboxPrimitive.Indicator
                className="group flex items-center justify-center text-[color:var(--text-on-accent)]"
            >
                <Check
                    className="h-3 w-3 group-data-[state=indeterminate]:hidden"
                    strokeWidth={3}
                    aria-hidden="true"
                />
                <Minus
                    className="hidden h-3 w-3 group-data-[state=indeterminate]:block"
                    strokeWidth={3}
                    aria-hidden="true"
                />
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    )
}

export type { CheckboxProps }
