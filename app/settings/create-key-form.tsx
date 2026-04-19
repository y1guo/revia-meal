'use client'

import { useActionState, useEffect, useState } from 'react'
import { createApiKey, type CreateKeyResult } from './actions'

export default function CreateKeyForm() {
    const [state, formAction, pending] = useActionState<
        CreateKeyResult | null,
        FormData
    >(createApiKey, null)
    const [name, setName] = useState('')

    // Clear the name only on success — if the submit failed we want the
    // user's typed name to remain so they can fix and retry. (React 19
    // auto-resets uncontrolled inputs on any action completion, which is
    // why `name` is controlled here.)
    useEffect(() => {
        if (state?.ok) setName('')
    }, [state])

    return (
        <div className="space-y-3">
            <form action={formAction} className="flex gap-2 max-w-xl">
                <input
                    name="name"
                    required
                    maxLength={64}
                    placeholder="e.g. Slack cron"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={pending}
                    className="flex-1 border rounded-md px-3 py-2 bg-transparent disabled:opacity-60"
                />
                <button
                    type="submit"
                    disabled={pending || !name.trim()}
                    className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
                >
                    {pending ? 'Creating…' : 'Create key'}
                </button>
            </form>

            {state?.ok === false && (
                <p className="text-sm text-red-600 dark:text-red-400">
                    {state.error}
                </p>
            )}

            {state?.ok && (
                <div className="border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 rounded-md p-4 space-y-2">
                    <p className="text-sm font-medium">
                        Copy this token now — it won&apos;t be shown again.
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Saved as <strong>{state.name}</strong>. Only the hash is stored;
                        if you lose the plaintext, revoke this key and create a new one.
                    </p>
                    <code className="block text-xs break-all bg-white dark:bg-black border rounded-md p-2 font-mono select-all">
                        {state.plaintext}
                    </code>
                </div>
            )}
        </div>
    )
}
