'use client'

import { cancelPollAction } from './actions'

export default function CancelButton({
    pollId,
    label,
}: {
    pollId: string
    label: string
}) {
    return (
        <form action={cancelPollAction}>
            <input type="hidden" name="poll_id" value={pollId} />
            <button
                type="submit"
                onClick={(e) => {
                    if (
                        !window.confirm(
                            `Cancel this poll?\n\n${label}\n\nAny exercised credits come back, participation locks are released, and the poll is marked cancelled. The row itself is preserved.`,
                        )
                    ) {
                        e.preventDefault()
                    }
                }}
                className="text-xs rounded-md border border-red-300 text-red-700 dark:border-red-800 dark:text-red-400 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-950"
            >
                Cancel
            </button>
        </form>
    )
}
