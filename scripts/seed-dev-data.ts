/**
 * Populate the dev database with realistic usage: ~15 users, ~20 restaurants,
 * a second Happy Hour template, and ~60 weekdays of historical polls with
 * plausible vote patterns and the banked-credit ledger kept consistent.
 *
 * Also seeds enough variety to exercise the newer schema features:
 *   - restaurant_hours rows on 4 restaurants (some closed on certain weekdays)
 *   - rich_content blobs on 3 restaurants (avatar + cover + menu thumbnails)
 *   - poll_options.disabled_at on 2 historical polls (soft-disabled options)
 *   - poll_overrides rows on 2 historical polls (admin-overridden winners)
 *
 * Idempotent for entities looked up by natural key (email / name). Historical
 * polls are only inserted for (template, date) pairs that don't already have
 * a poll, so re-running will fill in gaps rather than duplicate. The feature-
 * exercising additions above assume a mostly-clean DB — they'll no-op or
 * duplicate cleanly on upserts but may double-apply on the override / disable
 * passes if you run against a DB that already has history. Run them against a
 * freshly baselined environment for clean output.
 *
 * Usage: pnpm seed-dev-data
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { fromZonedTime } from 'date-fns-tz'
import { randomUUID } from 'node:crypto'
import type { RichContent } from '@/lib/rich-content'

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

/**
 * Give a handful of restaurants non-default weekly open hours so the poll
 * instantiation filter (ensureTodaysPoll → restaurant_hours) has something
 * to exercise. Restaurants not in this map fall back to the "unconfigured =
 * open every day" sentinel, so the bulk of historical polls are unaffected.
 */
const HOURS_BY_NAME: Record<
    string,
    { day_of_week: number; opens_at: string | null; closes_at: string | null }[]
> = {
    "Joe's Pizza": [
        // Mon–Sat 11:00–22:00; closed Sunday (no row).
        { day_of_week: 1, opens_at: '11:00', closes_at: '22:00' },
        { day_of_week: 2, opens_at: '11:00', closes_at: '22:00' },
        { day_of_week: 3, opens_at: '11:00', closes_at: '22:00' },
        { day_of_week: 4, opens_at: '11:00', closes_at: '22:00' },
        { day_of_week: 5, opens_at: '11:00', closes_at: '22:00' },
        { day_of_week: 6, opens_at: '11:00', closes_at: '22:00' },
    ],
    'Mensho Tokyo': [
        // Weekdays only.
        { day_of_week: 1, opens_at: '11:30', closes_at: '14:30' },
        { day_of_week: 2, opens_at: '11:30', closes_at: '14:30' },
        { day_of_week: 3, opens_at: '11:30', closes_at: '14:30' },
        { day_of_week: 4, opens_at: '11:30', closes_at: '14:30' },
        { day_of_week: 5, opens_at: '11:30', closes_at: '14:30' },
    ],
    'Hook Fish Co.': [
        // Mon–Sat, shorter closing time.
        { day_of_week: 1, opens_at: '10:00', closes_at: '17:00' },
        { day_of_week: 2, opens_at: '10:00', closes_at: '17:00' },
        { day_of_week: 3, opens_at: '10:00', closes_at: '17:00' },
        { day_of_week: 4, opens_at: '10:00', closes_at: '17:00' },
        { day_of_week: 5, opens_at: '10:00', closes_at: '17:00' },
        { day_of_week: 6, opens_at: '10:00', closes_at: '17:00' },
    ],
    'Rintaro Izakaya': [
        // Tue–Sun only (closed Monday); dinner-only.
        { day_of_week: 2, opens_at: '17:00', closes_at: '22:00' },
        { day_of_week: 3, opens_at: '17:00', closes_at: '22:00' },
        { day_of_week: 4, opens_at: '17:00', closes_at: '22:00' },
        { day_of_week: 5, opens_at: '17:00', closes_at: '22:00' },
        { day_of_week: 6, opens_at: '17:00', closes_at: '22:00' },
        { day_of_week: 7, opens_at: '17:00', closes_at: '22:00' },
    ],
}

async function seedRestaurantHours(
    supabase: SupabaseClient,
    restaurants: RestaurantRow[],
): Promise<void> {
    const byName = new Map(restaurants.map((r) => [r.name, r.id]))
    const rows: {
        restaurant_id: string
        day_of_week: number
        opens_at: string | null
        closes_at: string | null
    }[] = []
    for (const [name, days] of Object.entries(HOURS_BY_NAME)) {
        const id = byName.get(name)
        if (!id) continue
        for (const d of days) {
            rows.push({ restaurant_id: id, ...d })
        }
    }
    if (rows.length === 0) return
    const { error } = await supabase
        .from('restaurant_hours')
        .upsert(rows, {
            onConflict: 'restaurant_id,day_of_week',
            ignoreDuplicates: true,
        })
    if (error) throw new Error(`restaurant_hours: ${error.message}`)
}

/**
 * Synthetic DoorDash-shape rich_content for a few restaurants so the ballot
 * row's rich rendering path (avatars, cover images, menu thumbnails) has
 * something to show in dev. Images come from picsum.photos keyed on a stable
 * seed so they're deterministic-ish across runs.
 */
function richContentFor(
    name: string,
    cuisines: string[],
    address: string,
    menu: { name: string; description: string; price: string }[],
): RichContent {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    return {
        version: 1,
        source: 'doordash',
        source_url: `https://www.doordash.com/store/${slug}-dev-seed/000000/`,
        fetched_at: new Date().toISOString(),
        cuisines,
        price_range: '$$',
        rating: {
            value: Math.round((4.2 + Math.random() * 0.7) * 10) / 10,
            ratings_count_display: '1k+',
            reviews_count_display: '120+',
        },
        avatar_image_url: `https://picsum.photos/seed/${slug}-avatar/160/160`,
        cover_image_url: `https://picsum.photos/seed/${slug}-cover/1000/300`,
        hero_image_url: `https://picsum.photos/seed/${slug}-cover/1000/300`,
        address,
        menu_items: menu.map((m, i) => ({
            name: m.name,
            description: m.description,
            price: m.price,
            image_url: `https://picsum.photos/seed/${slug}-item-${i}/200/200`,
        })),
        hours: null,
    }
}

const RICH_CONTENT_BY_NAME: Record<string, RichContent> = {
    "Joe's Pizza": richContentFor(
        "Joe's Pizza",
        ['Pizza', 'Italian'],
        '412 Market St, San Francisco, CA',
        [
            { name: 'Plain Slice', description: 'Cheese slice, the classic.', price: '$4.50' },
            { name: 'Pepperoni Slice', description: 'Cup-and-char style.', price: '$5.25' },
            { name: 'Sicilian Square', description: 'Thick crust, well done.', price: '$5.50' },
            { name: 'Meatball Hero', description: 'House meatballs on a torpedo roll.', price: '$12.00' },
            { name: 'Garlic Knots (6)', description: 'Buttery, with marinara.', price: '$5.00' },
        ],
    ),
    'Marufuku Ramen': richContentFor(
        'Marufuku Ramen',
        ['Japanese', 'Ramen'],
        '1581 Webster St Ste 235, San Francisco, CA',
        [
            { name: 'Hakata Tonkotsu', description: '36-hour pork bone broth, chashu, ajitama.', price: '$18.50' },
            { name: 'Black Garlic Tonkotsu', description: 'Roasted garlic oil drizzle.', price: '$19.50' },
            { name: 'Spicy Tonkotsu', description: 'Chili oil, ground pork, bean sprouts.', price: '$19.95' },
            { name: 'Karaage', description: 'Japanese fried chicken, 5 pieces.', price: '$9.50' },
            { name: 'Gyoza (6)', description: 'Pan-seared pork dumplings.', price: '$8.50' },
        ],
    ),
    'Farmhouse Thai': richContentFor(
        'Farmhouse Thai',
        ['Thai'],
        '710 Valencia St, San Francisco, CA',
        [
            { name: 'Khao Soi', description: 'Northern Thai curry noodles with chicken.', price: '$19.00' },
            { name: 'Crying Tiger Steak', description: 'Grilled ribeye, jaew dipping sauce.', price: '$26.00' },
            { name: 'Pad See Ew', description: 'Wide noodles, broccoli, egg, your protein.', price: '$17.00' },
            { name: 'Som Tum', description: 'Green papaya salad, medium spice.', price: '$12.00' },
            { name: 'Mango Sticky Rice', description: 'Seasonal; ask when it’s ripe.', price: '$10.00' },
        ],
    ),
}

async function seedRichContent(
    supabase: SupabaseClient,
    restaurants: RestaurantRow[],
): Promise<void> {
    const byName = new Map(restaurants.map((r) => [r.name, r.id]))
    for (const [name, rc] of Object.entries(RICH_CONTENT_BY_NAME)) {
        const id = byName.get(name)
        if (!id) continue
        const { error } = await supabase
            .from('restaurants')
            .update({ rich_content: rc })
            .eq('id', id)
        if (error) throw new Error(`rich_content (${name}): ${error.message}`)
    }
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

    console.log('2/9 restaurants…')
    const restaurants = await fetchOrInsertRestaurants(supabase)
    console.log(`   ${restaurants.length} restaurants total`)

    console.log('3/9 restaurant weekly hours (subset)…')
    await seedRestaurantHours(supabase, restaurants)

    console.log('4/9 rich_content for a few restaurants…')
    await seedRichContent(supabase, restaurants)

    console.log('5/9 templates…')
    const templates = await fetchOrInsertTemplates(supabase)
    console.log(`   templates: ${templates.map((t) => t.name).join(', ')}`)

    console.log('6/9 template assignments…')
    const ballotByTemplate = await ensureTemplateRestaurants(
        supabase,
        templates,
        restaurants,
    )

    console.log('7/9 planning historical polls…')
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

    console.log('8/9 simulating votes and finalize…')
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

    console.log('9/9 writing to db…')
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

    // Post-insert: exercise two schema features that don't fit cleanly into
    // the main simulation loop — soft-disabled ballot options and overridden
    // poll winners. Both target a small slice of historical polls so the UI
    // has something to render without swamping the dataset.

    const finalizedPolls = pollRows
        .filter((p) => p.finalized_at !== null && p.winner_id !== null)
        .sort((a, b) =>
            (b.finalized_at ?? '').localeCompare(a.finalized_at ?? ''),
        )

    // Pick two finalized polls: on each, soft-disable a single ballot option
    // that WASN'T the winner (disabling the winner would violate the UI
    // invariants finalizePoll enforces).
    const disableTargets = finalizedPolls.slice(0, 2)
    for (const p of disableTargets) {
        const options = pollOptionRows.filter((o) => o.poll_id === p.id)
        const candidate = options.find(
            (o) => o.restaurant_id !== p.winner_id,
        )
        if (!candidate) continue
        // Disable roughly in the middle of the open window so it looks like
        // a mid-poll admin edit.
        const disabledAt = new Date(
            (new Date(p.opens_at).getTime() + new Date(p.closes_at).getTime()) /
                2,
        ).toISOString()
        const { error } = await supabase
            .from('poll_options')
            .update({ disabled_at: disabledAt })
            .eq('poll_id', candidate.poll_id)
            .eq('restaurant_id', candidate.restaurant_id)
        if (error) throw new Error(`poll_options.disabled_at: ${error.message}`)
    }

    // Pick two other finalized polls: override the winner to a different
    // ballot option. Bumps polls.winner_id and writes a poll_overrides audit
    // row each time.
    const overrideTargets = finalizedPolls.slice(2, 4)
    const overrideRows: {
        poll_id: string
        overridden_at: string
        overridden_by: string | null
        old_winner_id: string
        new_winner_id: string
        reason: string
    }[] = []
    for (const p of overrideTargets) {
        if (!p.winner_id) continue
        const options = pollOptionRows.filter((o) => o.poll_id === p.id)
        const newWinner = options.find(
            (o) => o.restaurant_id !== p.winner_id,
        )
        if (!newWinner) continue
        const overriddenAt = new Date(
            new Date(p.finalized_at ?? p.closes_at).getTime() + 30 * 60 * 1000,
        ).toISOString()
        overrideRows.push({
            poll_id: p.id,
            overridden_at: overriddenAt,
            overridden_by: adminId,
            old_winner_id: p.winner_id,
            new_winner_id: newWinner.restaurant_id,
            reason: 'Boss announced the pick — overriding the tallied winner.',
        })
        const { error: upErr } = await supabase
            .from('polls')
            .update({ winner_id: newWinner.restaurant_id })
            .eq('id', p.id)
        if (upErr) throw new Error(`poll winner override: ${upErr.message}`)
    }
    if (overrideRows.length > 0) {
        const { error } = await supabase
            .from('poll_overrides')
            .insert(overrideRows)
        if (error) throw new Error(`poll_overrides: ${error.message}`)
    }
    console.log(
        `   disabled ${disableTargets.length} option(s), overrode ${overrideRows.length} winner(s)`,
    )

    console.log('done.')
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
