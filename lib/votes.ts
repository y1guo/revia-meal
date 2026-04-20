import { createAdminClient } from '@/lib/supabase/admin'
import { getPollStatus } from '@/lib/polls'

export type SubmitVoteResult =
    | { ok: true; savedCount: number }
    | { ok: false; error: string }

export async function submitVoteForUser(
    userId: string,
    pollId: string,
    rawPicks: string[],
): Promise<SubmitVoteResult> {
    if (!pollId) return { ok: false, error: 'Missing poll id.' }

    const picks = Array.from(new Set(rawPicks.map(String))).filter(Boolean)
    const admin = createAdminClient()

    const { data: poll } = await admin
        .from('polls')
        .select(
            'id, template_id, scheduled_date, opens_at, closes_at, finalized_at, cancelled_at',
        )
        .eq('id', pollId)
        .maybeSingle()
    if (!poll) return { ok: false, error: 'Poll not found.' }

    const status = getPollStatus(poll)
    if (status !== 'open') {
        return { ok: false, error: `Voting is ${status.replace('_', ' ')}.` }
    }

    if (picks.length > 0) {
        const { data: options } = await admin
            .from('poll_options')
            .select('restaurant_id, disabled_at')
            .eq('poll_id', pollId)
        const activeIds = new Set(
            (options ?? [])
                .filter((o) => o.disabled_at === null)
                .map((o) => o.restaurant_id as string),
        )
        // Allow picks for disabled options only if this user already had a
        // vote for them before the admin disabled the option. Blocks new
        // ticks on disabled entries while preserving the "unvote-only"
        // affordance in the UI.
        const { data: existingVotes } = await admin
            .from('votes')
            .select('restaurant_id')
            .eq('poll_id', pollId)
            .eq('user_id', userId)
        const existingIds = new Set(
            (existingVotes ?? []).map((v) => v.restaurant_id as string),
        )
        for (const r of picks) {
            if (!activeIds.has(r) && !existingIds.has(r)) {
                return {
                    ok: false,
                    error: 'Picked a restaurant not on the ballot.',
                }
            }
        }
    }

    const { data: participation } = await admin
        .from('daily_participation')
        .select('template_id')
        .eq('user_id', userId)
        .eq('scheduled_date', poll.scheduled_date)
        .maybeSingle()

    if (
        participation &&
        participation.template_id !== poll.template_id &&
        picks.length > 0
    ) {
        return {
            ok: false,
            error: "You've already voted in another poll today.",
        }
    }

    const { error: delErr } = await admin
        .from('votes')
        .delete()
        .eq('poll_id', pollId)
        .eq('user_id', userId)
    if (delErr) {
        return { ok: false, error: `Failed to update votes: ${delErr.message}` }
    }

    if (picks.length === 0) {
        if (participation && participation.template_id === poll.template_id) {
            await admin
                .from('daily_participation')
                .delete()
                .eq('user_id', userId)
                .eq('scheduled_date', poll.scheduled_date)
        }
        return { ok: true, savedCount: 0 }
    }

    const voteWeight = 1 / picks.length
    const { error: insErr } = await admin.from('votes').insert(
        picks.map((restaurantId) => ({
            poll_id: pollId,
            user_id: userId,
            restaurant_id: restaurantId,
            template_id: poll.template_id,
            scheduled_date: poll.scheduled_date,
            vote_weight: voteWeight,
        })),
    )
    if (insErr) {
        return { ok: false, error: `Failed to save votes: ${insErr.message}` }
    }

    if (!participation) {
        const { error: partErr } = await admin
            .from('daily_participation')
            .upsert(
                {
                    user_id: userId,
                    scheduled_date: poll.scheduled_date,
                    template_id: poll.template_id,
                },
                { onConflict: 'user_id,scheduled_date', ignoreDuplicates: true },
            )
        if (partErr) {
            return {
                ok: false,
                error: `Failed to record participation: ${partErr.message}`,
            }
        }
        const { data: confirmed } = await admin
            .from('daily_participation')
            .select('template_id')
            .eq('user_id', userId)
            .eq('scheduled_date', poll.scheduled_date)
            .maybeSingle()
        if (confirmed && confirmed.template_id !== poll.template_id) {
            await admin
                .from('votes')
                .delete()
                .eq('poll_id', pollId)
                .eq('user_id', userId)
            return {
                ok: false,
                error: "You've already voted in another poll today.",
            }
        }
    }

    return { ok: true, savedCount: picks.length }
}
