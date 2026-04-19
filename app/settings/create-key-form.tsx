'use client'

import { Check, Copy, KeyRound } from 'lucide-react'
import { useActionState, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { TextInput } from '@/components/ui/TextInput'
import { cn } from '@/lib/cn'
import { createApiKey, type CreateKeyResult } from './actions'

export default function CreateKeyForm() {
    const [state, formAction, pending] = useActionState<
        CreateKeyResult | null,
        FormData
    >(createApiKey, null)
    const [name, setName] = useState('')
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (state?.ok) setName('')
    }, [state])

    useEffect(() => {
        if (!copied) return
        const timer = setTimeout(() => setCopied(false), 2000)
        return () => clearTimeout(timer)
    }, [copied])

    const copy = async () => {
        if (!state?.ok) return
        try {
            await navigator.clipboard.writeText(state.plaintext)
            setCopied(true)
        } catch {
            // Clipboard may be blocked — user can still select manually.
        }
    }

    return (
        <div className="space-y-4">
            <form action={formAction} className="space-y-2">
                <FormField
                    id="new-key-name"
                    label="New key"
                    help="A short, memorable label. Keys inherit your current role."
                    error={state && !state.ok ? state.error : undefined}
                >
                    <div className="flex gap-2">
                        <TextInput
                            name="name"
                            required
                            maxLength={64}
                            placeholder="e.g. Slack cron"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={pending}
                            className="flex-1"
                        />
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={!name.trim()}
                            loading={pending}
                        >
                            Create key
                        </Button>
                    </div>
                </FormField>
            </form>

            {state?.ok && (
                <div
                    role="status"
                    className={cn(
                        'rounded-[var(--radius-lg)]',
                        'bg-[color:var(--banked-bg)]',
                        'border border-[color:var(--accent-brand)]/40',
                        'p-4 space-y-3',
                    )}
                >
                    <div className="flex items-start gap-3">
                        <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent-brand)]/20 text-[color:var(--accent-brand)]">
                            <KeyRound size={16} strokeWidth={1.75} aria-hidden="true" />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                            <p className="font-display font-medium text-[color:var(--text-primary)]">
                                Copy this token now
                            </p>
                            <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
                                Saved as <strong>{state.name}</strong>. Only the
                                hash is stored; if you lose the plaintext, revoke
                                this key and create a new one.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-stretch gap-2">
                        <code
                            className={cn(
                                'flex-1 min-w-0 font-mono text-[0.8125rem]',
                                'bg-[color:var(--surface-raised)]',
                                'border border-[color:var(--border-subtle)]',
                                'rounded-[var(--radius-md)]',
                                'px-3 py-2 break-all select-all',
                                'text-[color:var(--text-primary)]',
                            )}
                        >
                            {state.plaintext}
                        </code>
                        <Button
                            variant="secondary"
                            onClick={copy}
                            leftIcon={copied ? Check : Copy}
                            className="shrink-0"
                            aria-label="Copy token"
                        >
                            {copied ? 'Copied' : 'Copy'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
