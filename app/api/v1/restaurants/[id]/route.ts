import { authenticateApiRequest } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
    request: Request,
    ctx: RouteContext<'/api/v1/restaurants/[id]'>,
) {
    const auth = await authenticateApiRequest(request)
    if (!auth.ok) {
        return Response.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await ctx.params
    const admin = createAdminClient()

    const { data: row } = await admin
        .from('restaurants')
        .select('id, name, notes, doordash_url, is_active')
        .eq('id', id)
        .maybeSingle()

    if (!row) {
        return Response.json(
            { error: 'Restaurant not found.' },
            { status: 404 },
        )
    }

    const restaurant: {
        id: string
        name: string
        notes: string | null
        doordash_url: string | null
        is_active?: boolean
    } = {
        id: row.id as string,
        name: row.name as string,
        notes: row.notes as string | null,
        doordash_url: row.doordash_url as string | null,
    }
    if (auth.user.role === 'admin') {
        restaurant.is_active = Boolean(row.is_active)
    }

    return Response.json({ restaurant })
}
