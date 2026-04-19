'use client'

import { deleteUser } from './actions'

export default function DeleteUserButton({
    userId,
    email,
}: {
    userId: string
    email: string
}) {
    return (
        <form action={deleteUser}>
            <input type="hidden" name="id" value={userId} />
            <button
                type="submit"
                onClick={(e) => {
                    if (
                        !window.confirm(
                            `Delete ${email}?\n\nThis removes the allowlist entry and cascades: their votes, participation records, and API keys will be deleted. Poll-cancellation attribution will be cleared but the polls themselves remain. This can't be undone.`,
                        )
                    ) {
                        e.preventDefault()
                    }
                }}
                className="text-xs rounded-md border border-red-300 text-red-700 dark:border-red-800 dark:text-red-400 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-950"
            >
                Delete
            </button>
        </form>
    )
}
