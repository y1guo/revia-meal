'use client'

import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '@/lib/cn'

type SwitchProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>

export function Switch({ className, ...rest }: SwitchProps) {
    return (
        <SwitchPrimitive.Root
            {...rest}
            className={cn(
                'relative inline-flex shrink-0 items-center',
                'h-[22px] w-[40px] rounded-full',
                'bg-[color:var(--surface-sunken)]',
                'transition-colors duration-150',
                'data-[state=checked]:bg-[color:var(--accent-brand)]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                className,
            )}
        >
            <SwitchPrimitive.Thumb
                className={cn(
                    'block h-[18px] w-[18px] rounded-full bg-white',
                    'shadow-[0_1px_2px_rgba(0,0,0,0.2)]',
                    'translate-x-[2px]',
                    'transition-transform duration-150',
                    'data-[state=checked]:translate-x-[20px]',
                    'motion-reduce:transition-none',
                )}
            />
        </SwitchPrimitive.Root>
    )
}

export type { SwitchProps }
