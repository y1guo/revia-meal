import { createClient } from '@supabase/supabase-js'

async function main() {
    const [, , pollId, opensShift, closesShift] = process.argv
    if (!pollId) {
        console.error(
            'usage: tsx --env-file=.env.local scripts/shift-poll.ts <pollId> [opens_at ISO] [closes_at ISO]',
        )
        process.exit(1)
    }
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const update: Record<string, string> = {}
    if (opensShift) update.opens_at = opensShift
    if (closesShift) update.closes_at = closesShift

    const { data, error } = await supabase
        .from('polls')
        .update(update)
        .eq('id', pollId)
        .select('id, opens_at, closes_at')
        .single()

    if (error) {
        console.error('update failed:', error.message)
        process.exit(1)
    }
    console.log('updated:', data)
}

main()
