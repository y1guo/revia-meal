'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { NativeSelect } from '@/components/ui/NativeSelect'

export function StatusFilter({ value }: { value: string }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [, startTransition] = useTransition()

    const onChange = (next: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (next) params.set('status', next)
        else params.delete('status')
        params.delete('page')
        startTransition(() => {
            const qs = params.toString()
            router.replace(qs ? `?${qs}` : '?', { scroll: false })
        })
    }

    return (
        <label className="inline-flex items-center gap-2 text-[0.8125rem] text-[color:var(--text-secondary)]">
            <span>Status</span>
            <NativeSelect
                name="status"
                value={value}
                onChange={(e) => onChange(e.currentTarget.value)}
                size="sm"
                className="min-w-[130px]"
            >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
            </NativeSelect>
        </label>
    )
}
