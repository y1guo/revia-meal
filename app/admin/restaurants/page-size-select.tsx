'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { TextInput } from '@/components/ui/TextInput'
import {
    MAX_PAGE_SIZE,
    MIN_PAGE_SIZE,
    PAGE_SIZE_PRESETS,
} from './page-size'

const isPreset = (n: number) => PAGE_SIZE_PRESETS.includes(n)

/**
 * URL-driven "rows per page" control. Presets (25/50/100) apply immediately;
 * "Custom" reveals a number field that commits on Enter or blur. Writing the
 * `size` param also clears `page` so you never land on an out-of-range page
 * after shrinking the list.
 */
export function PageSizeSelect({ value }: { value: number }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [, startTransition] = useTransition()
    const inputRef = useRef<HTMLInputElement | null>(null)

    // `value` is the clamped size resolved server-side. Derive whether we're in
    // preset or custom mode from it, re-syncing if the URL changes externally
    // (back button, shared link) via the store-from-previous-render pattern.
    const [custom, setCustom] = useState(!isPreset(value))
    const [draft, setDraft] = useState(isPreset(value) ? '' : String(value))
    const [lastValue, setLastValue] = useState(value)
    if (value !== lastValue) {
        setLastValue(value)
        setCustom(!isPreset(value))
        setDraft(isPreset(value) ? '' : String(value))
    }

    const push = (size: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('size', String(size))
        params.delete('page')
        startTransition(() => {
            const qs = params.toString()
            router.replace(qs ? `?${qs}` : '?', { scroll: false })
        })
    }

    const onSelect = (next: string) => {
        if (next === 'custom') {
            setCustom(true)
            setDraft(String(value))
            // Defer focus until the field has rendered.
            requestAnimationFrame(() => inputRef.current?.focus())
            return
        }
        setCustom(false)
        push(Number(next))
    }

    const commitCustom = () => {
        const n = Number(draft.trim())
        if (!Number.isInteger(n) || n < MIN_PAGE_SIZE) {
            // Invalid entry: snap the field back to the active value, no nav.
            setDraft(String(value))
            return
        }
        const clamped = Math.min(n, MAX_PAGE_SIZE)
        setDraft(String(clamped))
        if (clamped !== value) push(clamped)
    }

    const selectValue = custom ? 'custom' : String(value)

    return (
        <label className="inline-flex items-center gap-2 text-[0.8125rem] text-[color:var(--text-secondary)]">
            <span>Show</span>
            <NativeSelect
                name="size"
                value={selectValue}
                onChange={(e) => onSelect(e.currentTarget.value)}
                size="sm"
                className="min-w-[90px]"
            >
                {!isPreset(value) && !custom && (
                    // Edge case: a clamped non-preset size arrived from the URL
                    // but we haven't entered custom mode — keep it selectable.
                    <option value={String(value)}>{value}</option>
                )}
                {PAGE_SIZE_PRESETS.map((n) => (
                    <option key={n} value={String(n)}>
                        {n}
                    </option>
                ))}
                <option value="custom">Custom…</option>
            </NativeSelect>
            {custom && (
                <TextInput
                    ref={inputRef}
                    size="sm"
                    type="number"
                    inputMode="numeric"
                    min={MIN_PAGE_SIZE}
                    max={MAX_PAGE_SIZE}
                    value={draft}
                    aria-label={`Rows per page (max ${MAX_PAGE_SIZE})`}
                    onChange={(e) => setDraft(e.currentTarget.value)}
                    onBlur={commitCustom}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault()
                            commitCustom()
                        }
                    }}
                    className="w-[72px] tabular-nums"
                />
            )}
        </label>
    )
}
