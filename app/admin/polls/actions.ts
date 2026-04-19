'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { cancelPoll } from '@/lib/polls'

export async function cancelPollAction(formData: FormData) {
    const admin = await requireAdmin()
    const pollId = String(formData.get('poll_id') ?? '')
    if (!pollId) return

    await cancelPoll(pollId, admin.id)
    revalidatePath('/admin/polls')
    revalidatePath(`/polls/${pollId}`)
    revalidatePath('/')
}
