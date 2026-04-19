'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type SelectSize = 'sm' | 'md' | 'lg'

type SelectProps = {
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
    placeholder?: string
    size?: SelectSize
    disabled?: boolean
    error?: boolean
    name?: string
    className?: string
    id?: string
    'aria-describedby'?: string
    'aria-invalid'?: boolean
    'aria-required'?: boolean
    children: ReactNode
}

const SIZE: Record<SelectSize, string> = {
    sm: 'h-8 text-[0.8125rem] px-2.5',
    md: 'h-10 text-[0.875rem] px-3',
    lg: 'h-12 text-[1rem] px-4',
}

export function Select({
    value,
    defaultValue,
    onValueChange,
    placeholder,
    size = 'md',
    disabled,
    error,
    name,
    className,
    id,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-required': ariaRequired,
    children,
}: SelectProps) {
    return (
        <SelectPrimitive.Root
            value={value}
            defaultValue={defaultValue}
            onValueChange={onValueChange}
            disabled={disabled}
            name={name}
        >
            <SelectPrimitive.Trigger
                id={id}
                aria-describedby={ariaDescribedBy}
                aria-invalid={ariaInvalid || error || undefined}
                aria-required={ariaRequired}
                className={cn(
                    'inline-flex items-center justify-between gap-2',
                    'w-full bg-[color:var(--surface-raised)]',
                    'border rounded-[var(--radius-md)]',
                    'text-[color:var(--text-primary)] data-[placeholder]:text-[color:var(--text-tertiary)]',
                    'transition-colors duration-150',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    error
                        ? 'border-tomato-500'
                        : 'border-[color:var(--border-subtle)]',
                    'data-[state=open]:border-[color:var(--accent-brand)]',
                    SIZE[size],
                    className,
                )}
            >
                <SelectPrimitive.Value placeholder={placeholder} />
                <SelectPrimitive.Icon>
                    <ChevronDown
                        size={16}
                        strokeWidth={1.75}
                        aria-hidden="true"
                        className="text-[color:var(--text-secondary)]"
                    />
                </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>
            <SelectPrimitive.Portal>
                <SelectPrimitive.Content
                    position="popper"
                    sideOffset={4}
                    className={cn(
                        'z-50 max-h-[320px]',
                        'min-w-[var(--radix-select-trigger-width)]',
                        'bg-[color:var(--surface-raised)]',
                        'border border-[color:var(--border-subtle)]',
                        'rounded-[var(--radius-md)]',
                        'shadow-[var(--shadow-card-hover)]',
                        'p-1',
                    )}
                >
                    <SelectPrimitive.ScrollUpButton className="flex items-center justify-center h-6 text-[color:var(--text-secondary)]">
                        <ChevronUp size={14} strokeWidth={1.75} />
                    </SelectPrimitive.ScrollUpButton>
                    <SelectPrimitive.Viewport>
                        {children}
                    </SelectPrimitive.Viewport>
                    <SelectPrimitive.ScrollDownButton className="flex items-center justify-center h-6 text-[color:var(--text-secondary)]">
                        <ChevronDown size={14} strokeWidth={1.75} />
                    </SelectPrimitive.ScrollDownButton>
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
    )
}

type SelectItemProps = {
    value: string
    disabled?: boolean
    className?: string
    children: ReactNode
}

export function SelectItem({
    value,
    disabled,
    className,
    children,
}: SelectItemProps) {
    return (
        <SelectPrimitive.Item
            value={value}
            disabled={disabled}
            className={cn(
                'relative flex items-center pl-7 pr-2',
                'h-[34px] rounded-[var(--radius-sm)]',
                'text-[0.875rem] text-[color:var(--text-primary)]',
                'cursor-pointer select-none outline-none',
                'data-[highlighted]:bg-[color:var(--surface-sunken)]',
                'data-[state=checked]:font-medium',
                'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
                className,
            )}
        >
            <SelectPrimitive.ItemIndicator className="absolute left-2 top-1/2 -translate-y-1/2">
                <Check
                    size={14}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="text-[color:var(--accent-brand)]"
                />
            </SelectPrimitive.ItemIndicator>
            <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        </SelectPrimitive.Item>
    )
}

export const SelectSeparator = SelectPrimitive.Separator
export const SelectLabel = SelectPrimitive.Label
export const SelectGroup = SelectPrimitive.Group
