import { authenticateApiRequest } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { finalizePoll, getPollStatus, type PollStatus } from '@/lib/polls'

type PollRow = {
    id: string
    template_id: string
    scheduled_date: string
    opens_at: string
    closes_at: string
    finalized_at: string | null
    cancelled_at: string | null
    cancellation_reason: string | null
    winner_id: string | null
}

const POLL_SELECT =
    'id, template_id, scheduled_date, opens_at, closes_at, finalized_at, cancelled_at, cancellation_reason, winner_id'

export async function GET(
    request: Request,
    ctx: RouteContext<'/api/v1/polls/[id]/results'>,
) {
    const auth = await authenticateApiRequest(request)
    if (!auth.ok) {
        return Response.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await ctx.params
    const admin = createAdminClient()

    const { data: initial } = await admin
        .from('polls')
        .select(POLL_SELECT)
        .eq('id', id)
        .maybeSingle()

    if (!initial) {
        return Response.json({ error: 'Poll not found.' }, { status: 404 })
    }

    let poll = initial as PollRow

    // Lazy-finalize if past the close window. Apply result locally — Next.js
    // fetch dedup returns stale data if we re-read the poll in the same
    // render.
    if (getPollStatus(poll) === 'pending_close') {
        const result = await finalizePoll(poll.id)
        const now = new Date().toISOString()
        if (result.status === 'finalized') {
            poll = { ...poll, finalized_at: now, winner_id: result.winnerId }
        } else if (result.status === 'cancelled') {
            poll = {
                ...poll,
                cancelled_at: now,
                cancellation_reason: result.reason,
            }
        }
    }

    const status = getPollStatus(poll)

    // Ballot + template metadata are always safe to return.
    const [templateRes, optionsRes] = await Promise.all([
        admin
            .from('poll_templates')
            .select('id, name, description')
            .eq('id', poll.template_id)
            .maybeSingle(),
        admin
            .from('poll_options')
            .select('restaurant_id, disabled_at')
            .eq('poll_id', id),
    ])

    const disabledByRestaurant = new Map(
        (optionsRes.data ?? []).map((o) => [
            o.restaurant_id as string,
            o.disabled_at !== null,
        ]),
    )
    const ballotIds = (optionsRes.data ?? []).map(
        (o) => o.restaurant_id as string,
    )
    const { data: rData } =
        ballotIds.length > 0
            ? await admin
                  .from('restaurants')
                  .select('id, name, doordash_url, notes')
                  .in('id', ballotIds)
            : { data: [] as { id: string; name: string; doordash_url: string | null; notes: string | null }[] }
    const ballot = (rData ?? []).map((r) => ({
        id: r.id as string,
        name: r.name as string,
        doordash_url: r.doordash_url as string | null,
        notes: r.notes as string | null,
        disabled: disabledByRestaurant.get(r.id as string) ?? false,
    }))

    // Tallies and voter breakdown are only returned once the poll is
    // concluded — matches the web UI's visibility rules (no live leaks
    // during open/scheduled).
    let tallies: Array<{
        restaurant_id: string
        today_votes: number
        banked_boost: number
        total_tally: number
    }> = []
    let voters: Array<{
        user_id: string
        restaurant_id: string
        vote_weight: number
        display_name: string | null
        email: string
    }> = []

    if (status === 'closed' || status === 'cancelled') {
        const [resultsRes, votesRes] = await Promise.all([
            admin
                .from('poll_results')
                .select(
                    'restaurant_id, today_votes, banked_boost, total_tally',
                )
                .eq('poll_id', id),
            admin
                .from('votes')
                .select('user_id, restaurant_id, vote_weight')
                .eq('poll_id', id),
        ])
        tallies = (resultsRes.data ?? []).map((r) => ({
            restaurant_id: r.restaurant_id as string,
            today_votes: Number(r.today_votes),
            banked_boost: Number(r.banked_boost),
            total_tally: Number(r.total_tally),
        }))

        const voterIds = Array.from(
            new Set(
                (votesRes.data ?? []).map((v) => v.user_id as string),
            ),
        )
        const { data: userRows } =
            voterIds.length > 0
                ? await admin
                      .from('users')
                      .select('id, display_name, email')
                      .in('id', voterIds)
                : { data: [] as { id: string; display_name: string | null; email: string }[] }
        const userMap = new Map(
            (userRows ?? []).map((u) => [
                u.id as string,
                {
                    display_name: u.display_name as string | null,
                    email: u.email as string,
                },
            ]),
        )
        voters = (votesRes.data ?? []).map((v) => {
            const u = userMap.get(v.user_id as string)
            return {
                user_id: v.user_id as string,
                restaurant_id: v.restaurant_id as string,
                vote_weight: Number(v.vote_weight),
                display_name: u?.display_name ?? null,
                email: u?.email ?? '',
            }
        })
    }

    return Response.json({
        poll: {
            id: poll.id,
            scheduled_date: poll.scheduled_date,
            status: status satisfies PollStatus,
            opens_at: poll.opens_at,
            closes_at: poll.closes_at,
            finalized_at: poll.finalized_at,
            cancelled_at: poll.cancelled_at,
            cancellation_reason: poll.cancellation_reason,
            winner_id: poll.winner_id,
        },
        template: templateRes.data
            ? {
                  id: templateRes.data.id,
                  name: templateRes.data.name,
                  description: templateRes.data.description,
              }
            : null,
        ballot,
        tallies,
        voters,
    })
}
