'use client'

import { Moon, MonitorSmartphone, Sun, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
    applyTheme,
    readThemeCookie,
    writeThemeCookie,
    type ThemePreference,
} from '@/lib/theme'
import { cn } from '@/lib/cn'

type Option = {
    value: ThemePreference
    label: string
    icon: LucideIcon
}

const OPTIONS: Option[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: MonitorSmartphone },
]

type ThemeToggleProps = {
    size?: 'sm' | 'md'
    iconsOnly?: boolean
    className?: string
}

export function ThemeToggle({
    size = 'sm',
    iconsOnly = false,
    className,
}: ThemeToggleProps) {
    const [preference, setPreference] = useState<ThemePreference>('system')
    const [mounted, setMounted] = useState(false)
    const buttonsRef = useRef<Array<HTMLButtonElement | null>>([])

    useEffect(() => {
        setPreference(readThemeCookie())
        setMounted(true)
    }, [])

    const handleChange = (next: ThemePreference) => {
        setPreference(next)
        writeThemeCookie(next)
        applyTheme(next)
    }

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
        e.preventDefault()
        const direction = e.key === 'ArrowRight' ? 1 : -1
        const nextIndex =
            (index + direction + OPTIONS.length) % OPTIONS.length
        const nextOption = OPTIONS[nextIndex]
        handleChange(nextOption.value)
        buttonsRef.current[nextIndex]?.focus()
    }

    const trackHeight = size === 'sm' ? 'h-8' : 'h-10'
    const segmentPad = size === 'sm' ? 'px-2.5' : 'px-3'

    return (
        <div
            role="radiogroup"
            aria-label="Theme"
            className={cn(
                'inline-flex items-center gap-0.5',
                'bg-[color:var(--surface-sunken)]',
                'border border-[color:var(--border-subtle)]',
                'rounded-full p-0.5',
                trackHeight,
                className,
            )}
        >
            {OPTIONS.map(({ value, label, icon: Icon }, index) => {
                const selected = mounted && preference === value
                return (
                    <button
                        key={value}
                        ref={(el) => {
                            buttonsRef.current[index] = el
                        }}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={iconsOnly ? label : undefined}
                        tabIndex={selected || (!mounted && index === 0) ? 0 : -1}
                        onClick={() => handleChange(value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className={cn(
                            'inline-flex flex-1 items-center justify-center gap-1.5',
                            'h-full rounded-full',
                            'text-[0.8125rem] font-medium leading-none',
                            'transition-colors duration-150',
                            segmentPad,
                            selected
                                ? 'bg-[color:var(--surface-raised)] text-[color:var(--text-primary)] shadow-[var(--shadow-card-rest)]'
                                : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]',
                        )}
                    >
                        <Icon
                            size={14}
                            strokeWidth={1.75}
                            aria-hidden="true"
                        />
                        {!iconsOnly && <span>{label}</span>}
                    </button>
                )
            })}
        </div>
    )
}
