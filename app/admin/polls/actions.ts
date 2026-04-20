'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { cancelPoll, editPollBallot, overridePollWinner } from '@/lib/polls'

export async function cancelPollAction(formData: FormData) {
    const admin = await requireAdmin()
    const pollId = String(formData.get('poll_id') ?? '')
    if (!pollId) return

    await cancelPoll(pollId, admin.id)
    revalidatePath('/admin/polls')
    revalidatePath(`/polls/${pollId}`)
    revalidatePath('/')
}

export async function overridePollAction(formData: FormData) {
    const admin = await requireAdmin()
    const pollId = String(formData.get('poll_id') ?? '')
    const newWinnerId = String(formData.get('new_winner_id') ?? '')
    const rawReason = String(formData.get('reason') ?? '').trim()
    const reason = rawReason ? rawReason.slice(0, 200) : null

    if (!pollId || !newWinnerId) {
        throw new Error('Missing poll_id or new_winner_id.')
    }

    const result = await overridePollWinner({
        adminUserId: admin.id,
        pollId,
        newWinnerId,
        reason,
    })

    if (result.status === 'error') {
        throw new Error(result.error)
    }

    revalidatePath('/admin/polls')
    revalidatePath(`/polls/${pollId}`)
    revalidatePath('/')
}

export async function editBallotAction(formData: FormData) {
    const admin = await requireAdmin()
    const pollId = String(formData.get('poll_id') ?? '')
    const added = formData
        .getAll('added')
        .map(String)
        .filter(Boolean)
    const removed = formData
        .getAll('removed')
        .map(String)
        .filter(Boolean)

    if (!pollId) throw new Error('Missing poll_id.')

    const result = await editPollBallot({
        adminUserId: admin.id,
        pollId,
        added,
        removed,
    })
    if (result.status === 'error') {
        throw new Error(result.error)
    }
    revalidatePath('/admin/polls')
    revalidatePath(`/polls/${pollId}`)
    revalidatePath('/')
}
