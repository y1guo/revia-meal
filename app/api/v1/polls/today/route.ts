import { authenticateApiRequest } from '@/lib/api-auth'
import { getTodaysDashboard } from '@/lib/polls'

export async function GET(request: Request) {
    const auth = await authenticateApiRequest(request)
    if (!auth.ok) {
        return Response.json({ error: auth.error }, { status: auth.status })
    }

    // Any authenticated, active user can read today's polls — matches the
    // web dashboard's visibility rules.
    const entries = await getTodaysDashboard()
    return Response.json({
        polls: entries.map(({ template, poll, status }) => ({
            id: poll.id,
            status,
            scheduled_date: poll.scheduled_date,
            opens_at: poll.opens_at,
            closes_at: poll.closes_at,
            finalized_at: poll.finalized_at,
            cancelled_at: poll.cancelled_at,
            cancellation_reason: poll.cancellation_reason,
            template: {
                id: template.id,
                name: template.name,
                description: template.description,
            },
        })),
    })
}
