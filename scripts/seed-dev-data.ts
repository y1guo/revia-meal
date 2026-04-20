/**
 * Populate the dev database with realistic usage: ~15 users, ~20 restaurants,
 * a second Happy Hour template, and ~60 weekdays of historical polls with
 * plausible vote patterns and the banked-credit ledger kept consistent.
 *
 * Idempotent for entities looked up by natural key (email / name). Historical
 * polls are only inserted for (template, date) pairs that don't already have
 * a poll, so re-running will fill in gaps rather than duplicate.
 *
 * Usage: pnpm seed-dev-data
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { fromZonedTime } from 'date-fns-tz'
import { randomUUID } from 'node:crypto'

type UserRow = {
    id: string
    email: string
    display_name: string | null
}
type RestaurantRow = { id: string; name: string }
type TemplateRow = {
    id: string
    name: string
    schedule: {
        days_of_week?: number[]
        opens_at_local?: string
        closes_at_local?: string
        timezone?: string
    }
}

const NEW_USERS: { email: string; display_name: string }[] = [
    { email: 'alice.chen@heyrevia.ai', display_name: 'Alice Chen' },
    { email: 'ben.okafor@heyrevia.ai', display_name: 'Ben Okafor' },
    { email: 'camila.ruiz@heyrevia.ai', display_name: 'Camila Ruiz' },
    { email: 'diego.park@heyrevia.ai', display_name: 'Diego Park' },
    { email: 'emma.nakamura@heyrevia.ai', display_name: 'Emma Nakamura' },
    { email: 'farah.habib@heyrevia.ai', display_name: 'Farah Habib' },
    { email: 'grace.liu@heyrevia.ai', display_name: 'Grace Liu' },
    { email: 'henry.bauer@heyrevia.ai', display_name: 'Henry Bauer' },
    { email: 'isla.kowalski@heyrevia.ai', display_name: 'Isla Kowalski' },
    { email: 'jamal.adeyemi@heyrevia.ai', display_name: 'Jamal Adeyemi' },
    { email: 'kiran.patel@heyrevia.ai', display_name: 'Kiran Patel' },
    { email: 'lena.svensson@heyrevia.ai', display_name: 'Lena Svensson' },
    { email: 'mateo.vargas@heyrevia.ai', display_name: 'Mateo Vargas' },
]

const NEW_RESTAURANTS: { name: string; notes?: string; doordash_url?: string }[] = [
    { name: "Joe's Pizza", notes: 'NY-style slices · cash only' },
    { name: 'Mensho Tokyo', notes: 'Tonkotsu ramen · 30-min wait typical' },
    { name: 'Souvla', notes: 'Greek rotisserie · good salads' },
    { name: 'The Melt', notes: 'Grilled cheese + soup combos' },
    { name: 'Banh Mi Saigon', notes: 'Pork belly is the move' },
    { name: 'Tacolicious', notes: 'Al pastor, carnitas, veggie' },
    { name: 'Hook Fish Co.', notes: 'Fish sandwiches, poke, chowder' },
    { name: 'Farmhouse Thai', notes: 'Khao soi is the signature' },
    { name: "Gus's Market", notes: 'Deli sandwiches · fast lunch' },
    { name: 'Ike’s Love & Sandwiches', notes: 'Dirty sauce, custom subs' },
    { name: 'Curry Up Now', notes: 'Indian burritos, tikka masala' },
    { name: 'Marufuku Ramen', notes: 'Hakata-style, rich broth' },
    { name: 'Rintaro Izakaya', notes: 'Handmade udon · pricier' },
    { name: 'Loló', notes: 'Mexican fusion, corn on the cob' },
    { name: 'Split Bread', notes: 'Smashed avocado toast, paninis' },
    { name: 'The Hall', notes: 'Food hall — something for everyone' },
    { name: 'Proper Food', notes: 'Salads, bowls, wraps · healthy' },
    { name: 'Shake Shack', notes: 'Burgers and shakes · reliable' },
]

// Simple mulberry32 PRNG so a re-run produces stable output.
function makeRng(seed: number): () => number {
    let state = seed >>> 0
    return () => {
        state = (state + 0x6d2b79f5) >>> 0
        let t = state
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function pick<T>(rng: () => number, arr: T[]): T {
    return arr[Math.floor(rng() * arr.length)]
}

function weightedPick<T>(
    rng: () => number,
    entries: [T, number][],
): T {
    const total = entries.reduce((s, [, w]) => s + w, 0)
    let r = rng() * total
    for (const [value, w] of entries) {
        r -= w
        if (r <= 0) return value
    }
    return entries[entries.length - 1][0]
}

function toISODate(d: Date): string {
    return d.toLocaleDateString('en-CA') // YYYY-MM-DD in local tz
}

function parseISODateTZ(isoDate: string): Date {
    return new Date(`${isoDate}T00:00:00Z`)
}

function getDOW(isoDate: string, tz: string): number {
    // 1=Mon..7=Sun, matching lib/polls.ts
    const name = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'long',
    }).format(parseISODateTZ(isoDate))
    const map: Record<string, number> = {
        Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4,
        Friday: 5, Saturday: 6, Sunday: 7,
    }
    return map[name] ?? 0
}

function datesBack(days: number): string[] {
    const out: string[] = []
    const today = new Date()
    for (let d = 1; d <= days; d++) {
        const t = new Date(today)
        t.setDate(today.getDate() - d)
        out.push(toISODate(t))
    }
    return out
}

type InsertedPoll = {
    id: string
    template_id: string
    scheduled_date: string
    opens_at: string
    closes_at: string
    status: 'finalized' | 'cancelled_admin' | 'cancelled_no_votes'
    winner_id: string | null
    cancelled_by: string | null
}

type VoteRecord = {
    poll_id: string
    user_id: string
    restaurant_id: string
    template_id: string
    scheduled_date: string
    vote_weight: number
    created_at: string
    exercised_at: string | null
    exercised_poll_id: string | null
}

async function fetchOrInsertUsers(
    supabase: SupabaseClient,
): Promise<UserRow[]> {
    const { data: existing } = await supabase
        .from('users')
        .select('id, email, display_name')
    const existingEmails = new Set((existing ?? []).map((u) => u.email))
    const toInsert = NEW_USERS.filter((u) => !existingEmails.has(u.email)).map(
        (u) => ({ ...u, role: 'user', is_active: true }),
    )
    if (toInsert.length > 0) {
        const { error } = await supabase.from('users').insert(toInsert)
        if (error) throw new Error(`users insert: ${error.message}`)
    }
    const { data: all, error } = await supabase
        .from('users')
        .select('id, email, display_name')
    if (error) throw error
    return (all ?? []) as UserRow[]
}

async function fetchOrInsertRestaurants(
    supabase: SupabaseClient,
): Promise<RestaurantRow[]> {
    const { data: existing } = await supabase.from('restaurants').select('name')
    const existingNames = new Set((existing ?? []).map((r) => r.name))
    const toInsert = NEW_RESTAURANTS.filter(
        (r) => !existingNames.has(r.name),
    ).map((r) => ({ ...r, is_active: true }))
    if (toInsert.length > 0) {
        const { error } = await supabase.from('restaurants').insert(toInsert)
        if (error) throw new Error(`restaurants insert: ${error.message}`)
    }
    const { data: all, error } = await supabase
        .from('restaurants')
        .select('id, name')
    if (error) throw error
    return (all ?? []) as RestaurantRow[]
}

async function fetchOrInsertTemplates(
    supabase: SupabaseClient,
): Promise<TemplateRow[]> {
    const { data: existing } = await supabase
        .from('poll_templates')
        .select('id, name, schedule')
    const hasHappyHour = (existing ?? []).some((t) => t.name === 'Happy Hour')
    if (!hasHappyHour) {
        const { error } = await supabase.from('poll_templates').insert({
            name: 'Happy Hour',
            description: 'Friday wind-down drinks',
            schedule: {
                timezone: 'America/Los_Angeles',
                days_of_week: [5],
                opens_at_local: '16:30',
                closes_at_local: '17:30',
            },
            is_active: true,
        })
        if (error) throw new Error(`happy hour template: ${error.message}`)
    }
    // Also correct the existing Lunch template if its schedule is the odd
    // all-day default — make it a normal 10:00–11:30 weekday window.
    const lunch = (existing ?? []).find((t) => t.name === 'Lunch')
    if (lunch) {
        const sched = (lunch.schedule ?? {}) as TemplateRow['schedule']
        const wantsFix =
            sched.opens_at_local === '00:00' ||
            sched.closes_at_local === '23:59' ||
            !sched.days_of_week ||
            sched.days_of_week.length !== 5
        if (wantsFix) {
            const { error } = await supabase
                .from('poll_templates')
                .update({
                    schedule: {
                        timezone: 'America/Los_Angeles',
                        days_of_week: [1, 2, 3, 4, 5],
                        opens_at_local: '10:00',
                        closes_at_local: '11:30',
                    },
                })
                .eq('id', lunch.id)
            if (error) throw new Error(`lunch schedule fix: ${error.message}`)
        }
    }
    const { data: all, error } = await supabase
        .from('poll_templates')
        .select('id, name, schedule')
    if (error) throw error
    return (all ?? []) as TemplateRow[]
}

async function ensureTemplateRestaurants(
    supabase: SupabaseClient,
    templates: TemplateRow[],
    restaurants: RestaurantRow[],
): Promise<Map<string, string[]>> {
    const rows: {
        template_id: string
        restaurant_id: string
        is_active: boolean
    }[] = []
    const byTemplate = new Map<string, string[]>()
    for (const template of templates) {
        const list: string[] = []
        // Happy Hour: assign every other restaurant (bar-friendly + others).
        // Lunch: assign all. This keeps the two ballots different enough.
        const filtered =
            template.name === 'Happy Hour'
                ? restaurants.filter((_, i) => i % 2 === 0)
                : restaurants
        for (const r of filtered) {
            rows.push({
                template_id: template.id,
                restaurant_id: r.id,
                is_active: true,
            })
            list.push(r.id)
        }
        byTemplate.set(template.id, list)
    }
    if (rows.length > 0) {
        const { error } = await supabase
            .from('template_restaurants')
            .upsert(rows, {
                onConflict: 'template_id,restaurant_id',
                ignoreDuplicates: true,
            })
        if (error) throw new Error(`template_restaurants: ${error.message}`)
    }
    return byTemplate
}

type SimContext = {
    rng: () => number
    users: UserRow[]
    userAttendance: Map<string, number> // user_id -> base attendance rate
    userFavorites: Map<string, Set<string>> // user_id -> set of restaurant_ids
}

function buildSimContext(users: UserRow[], restaurants: RestaurantRow[]): SimContext {
    const rng = makeRng(0x5eedbeef)
    const userAttendance = new Map<string, number>()
    const userFavorites = new Map<string, Set<string>>()
    for (const u of users) {
        userAttendance.set(u.id, 0.4 + rng() * 0.55) // 0.4 to 0.95
        const favCount = 3 + Math.floor(rng() * 3) // 3-5 favorites
        const favs = new Set<string>()
        while (favs.size < favCount && favs.size < restaurants.length) {
            favs.add(pick(rng, restaurants).id)
        }
        userFavorites.set(u.id, favs)
    }
    return { rng, users, userAttendance, userFavorites }
}

function simulatePoll(
    ctx: SimContext,
    pollId: string,
    template: TemplateRow,
    ballot: string[],
    scheduledDate: string,
    createdAtIso: string,
    openedAtIso: string,
    bankedByUserRestaurant: Map<string, number>,
): {
    votes: VoteRecord[]
    participation: {
        user_id: string
        scheduled_date: string
        template_id: string
        first_voted_at: string
    }[]
} {
    const { rng, users, userAttendance, userFavorites } = ctx
    const votes: VoteRecord[] = []
    const participation: {
        user_id: string
        scheduled_date: string
        template_id: string
        first_voted_at: string
    }[] = []
    const ballotSet = new Set(ballot)

    for (const user of users) {
        const attendance = userAttendance.get(user.id) ?? 0.5
        // Happy Hour is lower attendance.
        const tuned = template.name === 'Happy Hour' ? attendance * 0.55 : attendance
        if (rng() > tuned) continue

        // Pick 1-3 restaurants, weighted: 70% 1, 22% 2, 8% 3
        const pickCount = weightedPick<number>(rng, [
            [1, 70],
            [2, 22],
            [3, 8],
        ])
        const favs = userFavorites.get(user.id) ?? new Set<string>()
        // Build a preference-weighted candidate pool from the ballot
        const candidates = ballot.map((rid) => ({
            rid,
            weight:
                (favs.has(rid) ? 3 : 1) +
                // Slight boost for restaurants the user has banked credits for
                (bankedByUserRestaurant.get(`${user.id}|${rid}`) ?? 0) * 0.5,
        }))
        const chosen = new Set<string>()
        while (chosen.size < pickCount && chosen.size < candidates.length) {
            const remaining = candidates.filter((c) => !chosen.has(c.rid))
            const picked = weightedPick<string>(
                rng,
                remaining.map((c) => [c.rid, c.weight]),
            )
            if (ballotSet.has(picked)) chosen.add(picked)
        }
        if (chosen.size === 0) continue
        const weight = 1 / chosen.size
        // Jitter created_at within open window for realism.
        const windowStart = new Date(openedAtIso).getTime()
        const windowEnd = windowStart + 60 * 60 * 1000 // +1h from opens_at
        const createdAt = new Date(
            windowStart + rng() * (windowEnd - windowStart),
        ).toISOString()
        for (const rid of chosen) {
            votes.push({
                poll_id: pollId,
                user_id: user.id,
                restaurant_id: rid,
                template_id: template.id,
                scheduled_date: scheduledDate,
                vote_weight: weight,
                created_at: createdAt,
                exercised_at: null,
                exercised_poll_id: null,
            })
        }
        participation.push({
            user_id: user.id,
            scheduled_date: scheduledDate,
            template_id: template.id,
            first_voted_at: createdAt,
        })
    }
    // Suppress unused param warning; createdAtIso lets callers pass the poll
    // creation timestamp if they later want a different jitter window.
    void createdAtIso
    return { votes, participation }
}

function finalizeSim(
    votesInPoll: VoteRecord[],
    ballot: string[],
    templateId: string,
    bankedBalances: Map<string, number>, // key `user|template|restaurant` -> unexercised weight
    rng: () => number,
): {
    winnerId: string | null
    tallies: { restaurant_id: string; today_votes: number; banked_boost: number; total_tally: number }[]
} {
    // today_votes per restaurant = sum of weights
    // banked_boost per restaurant = sum over voters-for-that-restaurant of their banked balance for (user, template, restaurant)
    const todayByR = new Map<string, number>()
    const todayVotersByR = new Map<string, Set<string>>()
    for (const v of votesInPoll) {
        todayByR.set(v.restaurant_id, (todayByR.get(v.restaurant_id) ?? 0) + v.vote_weight)
        if (!todayVotersByR.has(v.restaurant_id))
            todayVotersByR.set(v.restaurant_id, new Set())
        todayVotersByR.get(v.restaurant_id)!.add(v.user_id)
    }
    const tallies = ballot.map((rid) => {
        const today_votes = todayByR.get(rid) ?? 0
        let banked_boost = 0
        const voters = todayVotersByR.get(rid) ?? new Set<string>()
        for (const uid of voters) {
            banked_boost +=
                bankedBalances.get(`${uid}|${templateId}|${rid}`) ?? 0
        }
        return {
            restaurant_id: rid,
            today_votes,
            banked_boost,
            total_tally: today_votes + banked_boost,
        }
    })
    if (tallies.every((t) => t.total_tally === 0)) {
        return { winnerId: null, tallies }
    }
    const maxTally = Math.max(...tallies.map((t) => t.total_tally))
    const ties = tallies.filter((t) => t.total_tally === maxTally)
    const winner = ties[Math.floor(rng() * ties.length)]
    return { winnerId: winner.restaurant_id, tallies }
}

async function chunkInsert<T>(
    supabase: SupabaseClient,
    table: string,
    rows: T[],
    chunkSize = 500,
): Promise<void> {
    for (let i = 0; i < rows.length; i += chunkSize) {
        const slice = rows.slice(i, i + chunkSize)
        const { error } = await supabase.from(table).insert(slice)
        if (error) throw new Error(`insert ${table}: ${error.message}`)
    }
}

async function main() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SECRET_KEY
    if (!url || !key) {
        console.error(
            'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local.',
        )
        process.exit(1)
    }
    const supabase: SupabaseClient = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    })

    console.log('1/7 users…')
    const users = await fetchOrInsertUsers(supabase)
    console.log(`   ${users.length} users total`)

    console.log('2/7 restaurants…')
    const restaurants = await fetchOrInsertRestaurants(supabase)
    console.log(`   ${restaurants.length} restaurants total`)

    console.log('3/7 templates…')
    const templates = await fetchOrInsertTemplates(supabase)
    console.log(`   templates: ${templates.map((t) => t.name).join(', ')}`)

    console.log('4/7 template assignments…')
    const ballotByTemplate = await ensureTemplateRestaurants(
        supabase,
        templates,
        restaurants,
    )

    console.log('5/7 planning historical polls…')
    const { data: existingPolls } = await supabase
        .from('polls')
        .select('template_id, scheduled_date')
    const existingKeys = new Set(
        (existingPolls ?? []).map(
            (p) => `${p.template_id}|${p.scheduled_date}`,
        ),
    )

    // Chronological list of (template, date, opens, closes) to generate.
    type Plan = {
        template: TemplateRow
        scheduled_date: string
        opens_at: string
        closes_at: string
    }
    const plans: Plan[] = []
    const dates = datesBack(90).reverse() // oldest first
    for (const date of dates) {
        for (const template of templates) {
            const sched = template.schedule
            if (
                !sched.timezone ||
                !sched.opens_at_local ||
                !sched.closes_at_local ||
                !sched.days_of_week?.length
            )
                continue
            if (!sched.days_of_week.includes(getDOW(date, sched.timezone))) continue
            const key = `${template.id}|${date}`
            if (existingKeys.has(key)) continue
            const opens = fromZonedTime(
                `${date}T${sched.opens_at_local}:00`,
                sched.timezone,
            )
            const closes = fromZonedTime(
                `${date}T${sched.closes_at_local}:00`,
                sched.timezone,
            )
            plans.push({
                template,
                scheduled_date: date,
                opens_at: opens.toISOString(),
                closes_at: closes.toISOString(),
            })
        }
    }
    console.log(`   will insert ${plans.length} polls`)

    console.log('6/7 simulating votes and finalize…')
    const ctx = buildSimContext(users, restaurants)

    const pollRows: {
        id: string
        template_id: string
        scheduled_date: string
        opens_at: string
        closes_at: string
        finalized_at: string | null
        cancelled_at: string | null
        cancellation_reason: string | null
        cancelled_by: string | null
        winner_id: string | null
        created_at: string
    }[] = []
    const pollOptionRows: { poll_id: string; restaurant_id: string }[] = []
    const allVotes: VoteRecord[] = []
    const allParticipation: {
        user_id: string
        scheduled_date: string
        template_id: string
        first_voted_at: string
    }[] = []
    const pollResultRows: {
        poll_id: string
        restaurant_id: string
        today_votes: number
        banked_boost: number
        total_tally: number
    }[] = []

    // Track unexercised balances per (user, template, restaurant).
    const bankedBalances = new Map<string, number>()
    // For per-user attendance bonus in Happy Hour / seed quality.
    const adminId =
        users.find((u) => u.email === 'guoyi0328@gmail.com')?.id ?? null

    for (const plan of plans) {
        const pollId = randomUUID()
        const ballot = ballotByTemplate.get(plan.template.id) ?? []
        if (ballot.length === 0) continue

        // ~2% admin cancellation, ~3% no-votes (rare but shows up in UI).
        const roll = ctx.rng()
        let forceCancelAdmin = roll < 0.02
        const poorTurnout = roll > 0.02 && roll < 0.06

        // For "poor turnout" polls, halve attendance.
        const origAttendance = new Map(ctx.userAttendance)
        if (poorTurnout) {
            for (const [uid, a] of ctx.userAttendance)
                ctx.userAttendance.set(uid, a * 0.15)
        }

        const bankedByUR = new Map<string, number>()
        for (const r of ballot) {
            for (const u of users) {
                const b = bankedBalances.get(`${u.id}|${plan.template.id}|${r}`)
                if (b) bankedByUR.set(`${u.id}|${r}`, b)
            }
        }
        const { votes, participation } = simulatePoll(
            ctx,
            pollId,
            plan.template,
            ballot,
            plan.scheduled_date,
            plan.opens_at,
            plan.opens_at,
            bankedByUR,
        )
        if (poorTurnout) {
            // Restore attendance rates for subsequent polls.
            for (const [uid, a] of origAttendance) ctx.userAttendance.set(uid, a)
        }

        pollOptionRows.push(
            ...ballot.map((rid) => ({ poll_id: pollId, restaurant_id: rid })),
        )

        const createdAt = new Date(
            new Date(plan.opens_at).getTime() - 12 * 60 * 60 * 1000,
        ).toISOString()

        if (forceCancelAdmin) {
            // Admin cancelled — may have some votes, may not.
            pollRows.push({
                id: pollId,
                template_id: plan.template.id,
                scheduled_date: plan.scheduled_date,
                opens_at: plan.opens_at,
                closes_at: plan.closes_at,
                finalized_at: null,
                cancelled_at: new Date(
                    new Date(plan.closes_at).getTime() - 10 * 60 * 1000,
                ).toISOString(),
                cancellation_reason: 'admin',
                cancelled_by: adminId,
                winner_id: null,
                created_at: createdAt,
            })
            // Votes are retained but the poll is cancelled, so they're
            // excluded from banked tallies per lib/polls cancellation logic.
            allVotes.push(...votes)
            // No participation for cancelled-by-admin polls is fine — we still
            // write them since users did vote.
            allParticipation.push(...participation)
            continue
        }

        if (votes.length === 0) {
            pollRows.push({
                id: pollId,
                template_id: plan.template.id,
                scheduled_date: plan.scheduled_date,
                opens_at: plan.opens_at,
                closes_at: plan.closes_at,
                finalized_at: null,
                cancelled_at: new Date(
                    new Date(plan.closes_at).getTime() + 5 * 60 * 1000,
                ).toISOString(),
                cancellation_reason: 'no_votes',
                cancelled_by: null,
                winner_id: null,
                created_at: createdAt,
            })
            continue
        }

        const { winnerId, tallies } = finalizeSim(
            votes,
            ballot,
            plan.template.id,
            bankedBalances,
            ctx.rng,
        )
        const finalizedAt = new Date(
            new Date(plan.closes_at).getTime() + 2 * 60 * 1000,
        ).toISOString()

        pollRows.push({
            id: pollId,
            template_id: plan.template.id,
            scheduled_date: plan.scheduled_date,
            opens_at: plan.opens_at,
            closes_at: plan.closes_at,
            finalized_at: finalizedAt,
            cancelled_at: null,
            cancellation_reason: null,
            cancelled_by: null,
            winner_id: winnerId,
            created_at: createdAt,
        })
        pollResultRows.push(
            ...tallies.map((t) => ({
                poll_id: pollId,
                restaurant_id: t.restaurant_id,
                today_votes: t.today_votes,
                banked_boost: t.banked_boost,
                total_tally: t.total_tally,
            })),
        )

        // Add votes to the ledger before exercising, so winners' past-and-
        // present rows are consistent.
        for (const v of votes) {
            const k = `${v.user_id}|${plan.template.id}|${v.restaurant_id}`
            bankedBalances.set(k, (bankedBalances.get(k) ?? 0) + v.vote_weight)
        }
        // Exercise: any unexercised (user, template, winner) vote held by a
        // user who voted for the winner today gets exercised by this poll.
        if (winnerId) {
            const winnersToday = new Set(
                votes
                    .filter((v) => v.restaurant_id === winnerId)
                    .map((v) => v.user_id),
            )
            for (const v of allVotes) {
                if (
                    v.exercised_at === null &&
                    v.template_id === plan.template.id &&
                    v.restaurant_id === winnerId &&
                    winnersToday.has(v.user_id)
                ) {
                    v.exercised_at = finalizedAt
                    v.exercised_poll_id = pollId
                }
            }
            // Also exercise today's own votes for the winner.
            for (const v of votes) {
                if (
                    v.restaurant_id === winnerId &&
                    winnersToday.has(v.user_id)
                ) {
                    v.exercised_at = finalizedAt
                    v.exercised_poll_id = pollId
                }
            }
            // Zero out the banked balance for exercised pairs.
            for (const uid of winnersToday) {
                bankedBalances.set(`${uid}|${plan.template.id}|${winnerId}`, 0)
            }
        }

        allVotes.push(...votes)
        allParticipation.push(...participation)
    }
    // forceCancelAdmin flag only used locally; silence unused-var.
    void 'forceCancelAdmin'

    console.log(
        `   generated: ${pollRows.length} polls, ${allVotes.length} votes, ${pollResultRows.length} result rows`,
    )

    console.log('7/7 writing to db…')
    await chunkInsert(supabase, 'polls', pollRows, 200)
    await chunkInsert(supabase, 'poll_options', pollOptionRows, 500)
    await chunkInsert(supabase, 'votes', allVotes, 500)
    // Participation collisions across templates on the same date: skip dupes.
    const seenPart = new Set<string>()
    const uniqPart = allParticipation.filter((p) => {
        const k = `${p.user_id}|${p.scheduled_date}`
        if (seenPart.has(k)) return false
        seenPart.add(k)
        return true
    })
    await chunkInsert(supabase, 'daily_participation', uniqPart, 500)
    await chunkInsert(supabase, 'poll_results', pollResultRows, 500)

    console.log('done.')
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
