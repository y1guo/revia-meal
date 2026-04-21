// Typed, versioned payload stored in restaurants.rich_content (see db/migrations/0006).
// Produced by the admin bookmarklet from DoorDash JSON-LD (lib/bookmarklet/source.ts)
// and read back by the ballot row, admin detail card, and import-review page.

export type RichContentMenuItem = {
    name: string
    description: string | null
    price: string | null
    image_url: string | null
}

/** One open bracket like 11:00–14:10. "HH:MM" 24-hour format. */
export type RichContentHoursRange = {
    opens_at: string
    closes_at: string
}

/** One weekday's hours. Empty `ranges` = closed on that day. */
export type RichContentHoursDay = {
    /** ISO-8601: 1 = Monday … 7 = Sunday, matches lib/polls.ts::getDayOfWeekISO. */
    day_of_week: number
    ranges: RichContentHoursRange[]
}

export type RichContent = {
    version: 1
    source: 'doordash'
    source_url: string
    fetched_at: string
    cuisines: string[]
    price_range: string | null
    /**
     * Verbatim display strings from the DoorDash page, e.g. `"4k+"` ratings
     * and `"100+"` public reviews. DoorDash caps JSON-LD's `reviewCount` at
     * 50 (SEO reasons), so we scrape the on-page strings instead of rounding.
     * Either count can be null if the page didn't render it.
     */
    rating: {
        value: number
        ratings_count_display: string | null
        reviews_count_display: string | null
    } | null
    /** Small round logo (used as ballot thumbnail when present). DOM-scraped. */
    avatar_image_url: string | null
    /** Wide hero/banner image. OG `cover_square` or first JSON-LD image. */
    cover_image_url: string | null
    /** Landscape variant used in the admin detail page. */
    hero_image_url: string | null
    address: string | null
    menu_items: RichContentMenuItem[]
    /**
     * Weekly DoorDash ordering hours scraped from the "See more" dialog.
     * `null` when the dialog wasn't available or the admin didn't open the
     * page long enough for hours to render. Always seven entries (Mon–Sun)
     * when present. A day with `ranges: []` is closed.
     */
    hours: RichContentHoursDay[] | null
}

export type DecodedPrefill = {
    name: string
    doordash_url: string | null
    rich_content: RichContent
}

const MAX_MENU_ITEMS = 10
const DOORDASH_URL_PREFIX = 'https://www.doordash.com/'

function asString(v: unknown): string | null {
    return typeof v === 'string' && v.length > 0 ? v : null
}

function asFiniteNumber(v: unknown): number | null {
    return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function asStringArray(v: unknown): string[] {
    if (!Array.isArray(v)) return []
    const out: string[] = []
    for (const entry of v) {
        if (typeof entry === 'string' && entry.length > 0) out.push(entry)
    }
    return out
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

function sanitizeHoursRange(v: unknown): RichContentHoursRange | null {
    if (!v || typeof v !== 'object') return null
    const obj = v as Record<string, unknown>
    const opens_at = asString(obj.opens_at)
    const closes_at = asString(obj.closes_at)
    if (!opens_at || !closes_at) return null
    if (!TIME_RE.test(opens_at) || !TIME_RE.test(closes_at)) return null
    return { opens_at, closes_at }
}

function sanitizeHoursDay(v: unknown): RichContentHoursDay | null {
    if (!v || typeof v !== 'object') return null
    const obj = v as Record<string, unknown>
    const dow = typeof obj.day_of_week === 'number' ? obj.day_of_week : null
    if (dow === null || dow < 1 || dow > 7 || !Number.isInteger(dow)) return null
    const ranges: RichContentHoursRange[] = []
    if (Array.isArray(obj.ranges)) {
        for (const r of obj.ranges) {
            const parsed = sanitizeHoursRange(r)
            if (parsed) ranges.push(parsed)
        }
    }
    return { day_of_week: dow, ranges }
}

function sanitizeHours(v: unknown): RichContentHoursDay[] | null {
    if (!Array.isArray(v)) return null
    const days: RichContentHoursDay[] = []
    const seen = new Set<number>()
    for (const entry of v) {
        const d = sanitizeHoursDay(entry)
        if (d && !seen.has(d.day_of_week)) {
            seen.add(d.day_of_week)
            days.push(d)
        }
    }
    return days.length > 0 ? days : null
}

function sanitizeMenuItem(v: unknown): RichContentMenuItem | null {
    if (!v || typeof v !== 'object') return null
    const obj = v as Record<string, unknown>
    const name = asString(obj.name)
    if (!name) return null
    return {
        name,
        description: asString(obj.description),
        price: asString(obj.price),
        image_url: asString(obj.image_url),
    }
}

function sanitizeRichContent(v: unknown): RichContent | null {
    if (!v || typeof v !== 'object') return null
    const obj = v as Record<string, unknown>

    if (obj.version !== 1) return null
    if (obj.source !== 'doordash') return null

    const source_url = asString(obj.source_url)
    if (!source_url || !source_url.startsWith(DOORDASH_URL_PREFIX)) return null

    const fetched_at = asString(obj.fetched_at)
    if (!fetched_at) return null

    // Rating: numeric value required; count strings are optional verbatim
    // display labels pulled from the DoorDash DOM (e.g. "4k+", "100+").
    let rating: RichContent['rating'] = null
    if (obj.rating && typeof obj.rating === 'object') {
        const r = obj.rating as Record<string, unknown>
        const value = asFiniteNumber(r.value)
        if (value !== null) {
            rating = {
                value,
                ratings_count_display: asString(r.ratings_count_display),
                reviews_count_display: asString(r.reviews_count_display),
            }
        }
    }

    const menu_items: RichContentMenuItem[] = []
    if (Array.isArray(obj.menu_items)) {
        for (const entry of obj.menu_items) {
            const item = sanitizeMenuItem(entry)
            if (item) menu_items.push(item)
            if (menu_items.length >= MAX_MENU_ITEMS) break
        }
    }

    return {
        version: 1,
        source: 'doordash',
        source_url,
        fetched_at,
        cuisines: asStringArray(obj.cuisines),
        price_range: asString(obj.price_range),
        rating,
        avatar_image_url: asString(obj.avatar_image_url),
        cover_image_url: asString(obj.cover_image_url),
        hero_image_url: asString(obj.hero_image_url),
        address: asString(obj.address),
        menu_items,
        hours: sanitizeHours(obj.hours),
    }
}

export function decodePrefill(raw: string): DecodedPrefill | null {
    if (!raw) return null

    let decoded: string
    try {
        decoded = Buffer.from(raw, 'base64').toString('utf-8')
    } catch {
        return null
    }

    let parsed: unknown
    try {
        parsed = JSON.parse(decoded)
    } catch {
        return null
    }

    if (!parsed || typeof parsed !== 'object') return null
    const obj = parsed as Record<string, unknown>

    const name = asString(obj.name)
    if (!name) return null

    const doordash_url_raw = asString(obj.doordash_url)
    const doordash_url =
        doordash_url_raw && doordash_url_raw.startsWith(DOORDASH_URL_PREFIX)
            ? doordash_url_raw
            : null

    const rich_content = sanitizeRichContent(obj.rich_content)
    if (!rich_content) return null

    return { name, doordash_url, rich_content }
}
