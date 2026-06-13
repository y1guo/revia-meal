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
                'relative inline-flex items-center justify-center shrink-0',
                'h-[18px] w-[18px] rounded-[5px]',
                // Invisible 44×44 hit area centered on the box — easier to tap
                // on touch without shifting layout.
                "before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']",
                'border-[1.5px] border-[color:var(--border-strong)]',
                'bg-[color:var(--surface-base)]',
                'transition-[background-color,border-color,box-shadow,transform] duration-200 ease-[var(--ease-out-quart)]',
                // Highlight the box when its enclosing choice row is hovered.
                'group-hover:border-[color:var(--accent-brand)]',
                // Checked: brand fill + a soft violet halo.
                'data-[state=checked]:bg-[color:var(--accent-brand)] data-[state=checked]:border-[color:var(--accent-brand)]',
                'data-[state=checked]:shadow-[0_0_0_4px_var(--choice-selected-bg)]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                className,
            )}
        >
            <CheckboxPrimitive.Indicator
                className="group flex items-center justify-center text-[color:var(--text-on-accent)] animate-check-pop motion-reduce:animate-none"
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
