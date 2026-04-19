'use client'

import { revokeApiKey } from './actions'

export default function RevokeButton({
    keyId,
    name,
}: {
    keyId: string
    name: string
}) {
    return (
        <form action={revokeApiKey}>
            <input type="hidden" name="key_id" value={keyId} />
            <button
                type="submit"
                onClick={(e) => {
                    if (
                        !window.confirm(
                            `Revoke "${name}"?\n\nAny future request using this key will fail. This can't be undone — you'd need to create a new key.`,
                        )
                    ) {
                        e.preventDefault()
                    }
                }}
                className="text-xs rounded-md border border-red-300 text-red-700 dark:border-red-800 dark:text-red-400 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-950"
            >
                Revoke
            </button>
        </form>
    )
}
