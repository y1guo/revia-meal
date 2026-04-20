import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { submitVoteForUser } from '@/lib/votes'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const user = await requireUser()
    const { id: pollId } = await params

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json(
            { ok: false, error: 'Invalid JSON body.' },
            { status: 400 },
        )
    }

    const picks =
        body &&
        typeof body === 'object' &&
        Array.isArray((body as { picks?: unknown }).picks)
            ? ((body as { picks: unknown[] }).picks.filter(
                  (v) => typeof v === 'string',
              ) as string[])
            : null
    if (!picks) {
        return NextResponse.json(
            { ok: false, error: 'Missing picks array.' },
            { status: 400 },
        )
    }

    const result = await submitVoteForUser(user.id, pollId, picks)
    if (result.ok) revalidatePath(`/polls/${pollId}`)
    return NextResponse.json(result)
}
