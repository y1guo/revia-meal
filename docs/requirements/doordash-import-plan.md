# Plan — DoorDash import + rich restaurant content

Implements [doordash-import.md](./doordash-import.md).

## Changes

**New**
- `db/migrations/0006_restaurant_rich_content.sql` — adds `rich_content jsonb` to `restaurants`.
- `lib/rich-content.ts` — shared `RichContent` type + `decodePrefill(raw)` pure function.
- `lib/bookmarklet/source.ts` — the bookmarklet body, authored as TS for type-check + unit-test convenience, exported as a single string constant.
- `app/admin/restaurants/bookmarklet-install.tsx` — the draggable-install card rendered above the restaurants table.
- `app/admin/restaurants/new/page.tsx` — the review-import page (prefill-required; redirects to `/admin/restaurants` when absent).
- `app/admin/restaurants/new/import-form.tsx` — client component for the form + save.
- `app/admin/restaurants/[id]/rich-content-card.tsx` — admin detail rich-content card with "Clear" action.
- `components/poll/BallotRow.tsx` — shared read-only row primitive (thumbnail + header + meta + expand). Vote-form composes it inside the `<label>` + checkbox wrapper; `BallotPreview` (scheduled/cancelled states) composes it plainly.
- `lib/__tests__/rich-content.test.ts` (optional, if we add vitest infra) or a `tsx` script that asserts the decoder behaves on a known fixture.

**Modified**
- `app/admin/restaurants/page.tsx` — insert the `BookmarkletInstall` card above the `RestaurantsTable`.
- `app/admin/restaurants/actions.ts` — add `addRestaurantFromImport` and `clearRestaurantRichContent` server actions. Leave `addRestaurant` alone.
- `app/admin/restaurants/[id]/page.tsx` — fetch `rich_content`, mount `<RichContentCard>` below the hours editor when present.
- `app/polls/[id]/page.tsx` — extend the `Restaurant` type with `rich_content`, include it in both the restaurants fetch and the `Ballot` payload passed to `VoteForm`, and in the `BallotPreview` props. Refactor the inline `BallotPreview` to use the new shared `<BallotRow>`.
- `app/polls/[id]/vote-form.tsx` — extend `Ballot` with `rich_content`, render each row by composing `<BallotRow>` inside the existing checkbox label. Owns the "Details ▾" open/close state via a small `useState<Set<string>>` of expanded row ids.

No schema changes elsewhere. No changes to `lib/polls.ts`, `lib/votes.ts`, or the `finalizePoll` path — rich content is display-only, not used in any computation.

## Migration

```sql
-- 0006_restaurant_rich_content.sql
alter table restaurants add column rich_content jsonb;
```

No index — rich_content is read only alongside the restaurant row, never filtered on. No default — absence is meaningful (`null` = "manually entered, no import"). Cascade is irrelevant (it's a column, not a row).

**Apply via Supabase dashboard SQL editor** after self-review, same as prior migrations.

## Shared type + decoder (`lib/rich-content.ts`)

```ts
export type RichContent = {
    version: 1
    source: 'doordash'
    source_url: string
    fetched_at: string
    description: string | null
    cuisines: string[]
    price_range: string | null
    rating: { value: number; count: number } | null
    cover_image_url: string | null
    hero_image_url: string | null
    address: string | null
    menu_items: Array<{
        name: string
        description: string | null
        price: string | null
        image_url: string | null
    }>
}

export type DecodedPrefill = {
    name: string
    doordash_url: string | null
    rich_content: RichContent
}

export function decodePrefill(raw: string): DecodedPrefill | null
```

Implementation approach (pure, sync):
1. `Buffer.from(raw, 'base64').toString('utf-8')` — we're server-side, `Buffer` is available.
2. `JSON.parse` inside try/catch; return `null` on any throw.
3. Structural validation — check each field matches expected type; coerce `menu_items` entries to the `{name, description, price, image_url}` shape, drop entries missing `name` (the only required field), cap at 10.
4. Reject if `rich_content.version !== 1` or `rich_content.source !== 'doordash'` or `source_url` doesn't start with `https://www.doordash.com/`.
5. Reject if top-level `name` is empty-string or missing.
6. Return `DecodedPrefill` with sanitized data.

Unknown fields at any level are stripped silently (forward-compat). The decoder is the sole definition of "what we'll accept" — the bookmarklet author and the page renderer both trust this.

## Bookmarklet (`lib/bookmarklet/source.ts`)

Exports a single `export const BOOKMARKLET_SOURCE: string` — a minified IIFE as a string. Authored as a readable function literal inside the file, then passed through a build-time minifier step — BUT since adding a build step is friction, v1 ships **hand-minified**: readable source in a `/* expanded */` block at the top as a comment for maintainability, minified body below as the actual export.

Skeleton of expanded version (for the comment):

```js
(function () {
    if (!/(^|\.)doordash\.com$/i.test(location.hostname)) {
        alert('This bookmarklet only works on DoorDash restaurant pages.');
        return;
    }

    var ldBlocks = document.querySelectorAll('script[type="application/ld+json"]');
    var restaurant = null;
    var menu = null;
    for (var i = 0; i < ldBlocks.length; i++) {
        try {
            var d = JSON.parse(ldBlocks[i].textContent || '');
            var arr = Array.isArray(d) ? d : [d];
            for (var j = 0; j < arr.length; j++) {
                var t = arr[j]['@type'];
                var types = Array.isArray(t) ? t : [t];
                if (types.indexOf('Restaurant') >= 0) restaurant = arr[j];
                if (types.indexOf('Menu') >= 0) menu = arr[j];
            }
        } catch (_) {}
    }
    if (!restaurant) {
        alert('Open a specific restaurant page and try again.');
        return;
    }

    var ogImage = (document.querySelector('meta[property="og:image"]') || {}).content || null;
    var ogDesc = (document.querySelector('meta[property="og:description"]') || {}).content || null;

    // ... build normalized RichContent; prefer Restaurant.hasMenu, fall back to top-level Menu block
    // ... stringify, base64, open new tab

    var payload = { name: /* ... */, doordash_url: /* ... */, rich_content: /* ... */ };
    var encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    if (encoded.length > 7500) {
        alert('Too much data to prefill — add this restaurant manually.');
        return;
    }
    window.open('${REVIA_ORIGIN}/admin/restaurants/new?prefill=' + encodeURIComponent(encoded), '_blank');
})();
```

`${REVIA_ORIGIN}` is a build-time placeholder. For dev it's `http://localhost:3000`; for prod it's the deployed domain. The install card renders with the correct origin baked in by reading `window.location.origin` on first client render (the install card is a client component).

Key implementation notes for the bookmarklet body:

- **Name extraction**: `restaurant.name` primarily (preserves native chars); fall back to `document.title` parsed to strip the DoorDash suffix. Fall back to `ogTitle` as last resort.
- **`doordash_url`**: `location.origin + location.pathname` — strip query and hash (DoorDash URLs carry tracking params we don't want).
- **Address**: `restaurant.address.streetAddress` + `addressLocality` + `addressRegion` joined with `, ` if all present, else null.
- **Cuisines**: `restaurant.servesCuisine` — normalize to `string[]` (it may be a string or array).
- **Price range**: `restaurant.priceRange` (already `"$" | "$$" | "$$$"` from DoorDash).
- **Rating**: `restaurant.aggregateRating.ratingValue` → number; `.reviewCount` → number. Null if either missing.
- **Cover image**: prefer `ogImage` (it's the cover_square variant). Fall back to `restaurant.image[0]`. Null if neither.
- **Hero image**: `restaurant.image[0]` (landscape). Often same as cover on DoorDash pages. Acceptable.
- **Menu items**: flat-map `restaurant.hasMenu.hasMenuSection[*].hasMenuItem`. Take first 10. Each item: `{ name, description: description ?? null, price: offers?.price ? ('$' + offers.price) : offers?.priceSpecification?.price ?? null, image_url: image?.[0] ?? null }`. If the Restaurant block lacks `hasMenu`, try the top-level Menu block.
- **Error handling**: no try/catch around the whole thing — if anything goes sideways we want a thrown error in the admin's console that shows up, not a silent dud. Explicit `alert()` only for the two "expected" failure modes (wrong hostname, no Restaurant block) and the size cap.

Unit testing: feed a captured Tasty Pot JSON-LD blob (saved as a fixture in `lib/bookmarklet/__fixtures__/tasty-pot.json`) to a Node-based test that stubs `document`, `location`, `alert`, `window.open`, and asserts the resulting `payload` object matches expected shape. Defer to `tsx` ad-hoc if vitest isn't wired.

## Install card (`app/admin/restaurants/bookmarklet-install.tsx`)

Client component. On mount, reads `window.location.origin`, substitutes it into the bookmarklet source, and sets the anchor's `href` imperatively via `ref.setAttribute`. **React strips `javascript:` URLs assigned through the JSX `href` prop as an XSS safeguard**, so we bypass the JSX pathway deliberately — this is the standard install-bookmarklet pattern.

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { BookMarked } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { BOOKMARKLET_SOURCE } from '@/lib/bookmarklet/source'

export function BookmarkletInstall() {
    const anchorRef = useRef<HTMLAnchorElement>(null)

    useEffect(() => {
        const el = anchorRef.current
        if (!el) return
        const src = BOOKMARKLET_SOURCE.replace('${REVIA_ORIGIN}', window.location.origin)
        el.setAttribute('href', 'javascript:' + src)
    }, [])

    return (
        <Card className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
            <div className="flex-1 space-y-1.5">
                <h2 className="font-display font-medium text-[1rem] text-[color:var(--text-primary)]">
                    Import from DoorDash
                </h2>
                <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
                    Drag the button to your bookmarks bar, then click it from any DoorDash restaurant page.
                </p>
            </div>
            <a
                ref={anchorRef}
                draggable="true"
                // Styled like Button variant="primary" via utility classes — not the <Button> component,
                // because we need a raw <a> with a javascript: href.
                className="…"
                onClick={(e) => {
                    e.preventDefault()
                    alert('Drag this button to your bookmarks bar to install. Clicking it here does nothing.')
                }}
            >
                <BookMarked size={16} /> Add to revia-meal
            </a>
        </Card>
    )
}
```

- `onClick` guard: if an admin actually clicks the button on this page (vs dragging it), we explain the install step. Without preventDefault the `javascript:` URL would run on the admin page and misbehave (no JSON-LD here).
- Pre-hydration: the anchor has no href before `useEffect` runs. Dragging is only meaningful after hydration anyway. The anchor still shows the label + icon during SSR; a cursor-hover that initiates drag a fraction of a second before mount would drag a blank. Acceptable.
- `BOOKMARKLET_SOURCE` contains the literal text `${REVIA_ORIGIN}` (not a JS template-literal; we export the source as a plain string). `.replace('${REVIA_ORIGIN}', origin)` does a single-pass substitution — the origin appears exactly once in the source. The source is pre-minified to single quotes + no newlines, so the resulting `javascript:…` URL is safe to use in `href` without additional URL-encoding.

## Review-import page (`app/admin/restaurants/new/page.tsx`)

```tsx
// Server component.
type SearchParams = Promise<{ prefill?: string }>

export default async function NewRestaurantPage({ searchParams }: { searchParams: SearchParams }) {
    await requireAdmin()
    const { prefill } = await searchParams
    if (!prefill) redirect('/admin/restaurants')

    const decoded = decodePrefill(prefill)
    if (!decoded) {
        return <ErrorCard />  // "Could not decode … Back to restaurants"
    }

    return <ImportForm decoded={decoded} />
}
```

`ImportForm` is the client component:
- Three controlled text inputs (name, doordash_url, notes) seeded from `decoded`.
- An `is_active` switch, defaulted `true`.
- A hidden field `rich_content_b64` carrying the original prefill string (NOT re-encoded from the edited fields — admin edits only the top-level catalog fields; rich_content is preserved intact).
- `<BallotRow>` preview card with a "This is what voters will see" heading.
- Collapsible `<details>` block with the raw JSON, pretty-printed.
- Save button → server action `addRestaurantFromImport(formData)` → redirect to `/admin/restaurants/:id`.
- Cancel → `Link href="/admin/restaurants"`.

## Shared `<BallotRow>` (`components/poll/BallotRow.tsx`)

```tsx
export type BallotRowProps = {
    name: string
    doordashUrl: string | null
    notes: string | null
    richContent: RichContent | null
    // Slots for interactive wrappers:
    leading?: React.ReactNode   // checkbox goes here on vote-form; null elsewhere
    nameSuffix?: React.ReactNode // BankedCreditChip, "Removed" chip — owned by parent
    disabled?: boolean          // muted styling
    expanded: boolean
    onToggleExpanded: () => void
}
```

Render:
- Flex row: `{leading}`, thumbnail (64px square or monogram fallback), right column (header line + meta line + Details button + conditionally-rendered expand panel).
- Thumbnail: `<img src={richContent?.cover_image_url}>` with `loading="lazy"`. Width matches mobile & desktop (64×64; rounded-[var(--radius-md)]).
- Header line: `<span>{name}</span>{nameSuffix}` (chip slot). Plus fallback-mode DoorDash link when `!richContent && doordashUrl` — preserves today's behavior for un-imported rows.
- Meta line (only when richContent has at least one of cuisines/price/rating): `Chinese · $$ · ★ 4.5`, each segment rendered conditionally.
- `Details ▾` button only when richContent present. `onClick` stops propagation, calls `onToggleExpanded`. Aria: `aria-expanded`, `aria-controls={expandId}`.
- Expand panel: collapsible `<div>` with `role="region"` and animated `max-height` transition. Contents: hero image (lazy-loaded), description, menu items grid, `Menu prices and details on DoorDash ↗` link, notes (moved here when rich_content present).

Reuse the row in:
- `VoteForm` — wrap in `<label>` + `<Checkbox>`. Pass `leading={<Checkbox .../>}`, pass `nameSuffix={isChecked && banked > 0 ? <BankedCreditChip/> : null}`, plus `disabled`/`expanded` from vote-form state. Tap on the label still toggles vote; `Details ▾` button inside stops propagation.
- `BallotPreview` (scheduled/cancelled) — no wrapper, just `<BallotRow ...>` inside a `<li>`. `leading=null`, `nameSuffix` = "you voted" chip in cancelled state. No vote toggle.
- `/admin/restaurants/new` preview — same call signature as BallotPreview. `leading=null`, `nameSuffix=null`.

## Admin detail rich-content card (`app/admin/restaurants/[id]/rich-content-card.tsx`)

Client component (needs the "Clear" button to open a `DestructiveConfirmModal`):

- Card with heading "Rich content" + subtitle "Imported from [DoorDash ↗] · Fetched {formatDateTime(fetched_at)}".
- Cover image (full width, ~240px tall, `object-cover`).
- Cuisines as chips, price_range, rating as monospace `★ 4.5 (320 reviews)`.
- Description paragraph.
- Address (if present) as a small muted line.
- Menu items as a vertical stack — each `<article>` with name, price on same line, description underneath, optional item image thumbnail on the right.
- Footer: `Clear rich content` button (`variant="ghost-destructive"`). Opens `DestructiveConfirmModal` with target = restaurant name, body = "This removes the imported data. The restaurant itself stays on the list. You can re-import later from DoorDash.", destructiveLabel = "Clear". `onConfirm` calls `clearRestaurantRichContent` server action.

No "Re-import" button with side effects — just a helper note: "To refresh, open the DoorDash page and click the bookmarklet again."

## Server actions (`app/admin/restaurants/actions.ts`)

Add two functions:

```ts
export async function addRestaurantFromImport(formData: FormData) {
    await requireAdmin()
    const name = String(formData.get('name') ?? '').trim()
    const doordash_url = String(formData.get('doordash_url') ?? '').trim() || null
    const notes = String(formData.get('notes') ?? '').trim() || null
    const is_active = formData.get('is_active') === 'on'
    const prefill = String(formData.get('rich_content_b64') ?? '')

    if (!name) throw new Error('Name is required.')

    const decoded = decodePrefill(prefill)
    if (!decoded) throw new Error('Import data was invalid or expired. Click the bookmarklet again.')

    const admin = createAdminClient()
    const { data, error } = await admin
        .from('restaurants')
        .insert({ name, doordash_url, notes, is_active, rich_content: decoded.rich_content })
        .select('id')
        .single()
    if (error || !data) throw new Error(error?.message ?? 'Insert failed.')

    revalidatePath('/admin/restaurants')
    redirect(`/admin/restaurants/${data.id}`)
}

export async function clearRestaurantRichContent(formData: FormData) {
    await requireAdmin()
    const id = String(formData.get('id') ?? '')
    if (!id) return
    const admin = createAdminClient()
    await admin.from('restaurants').update({ rich_content: null }).eq('id', id)
    revalidatePath('/admin/restaurants')
    revalidatePath(`/admin/restaurants/${id}`)
}
```

## Poll page + vote-form changes

Both the `Restaurant` type (`app/polls/[id]/page.tsx`) and the `Ballot` type (`app/polls/[id]/vote-form.tsx`) gain a `rich_content: RichContent | null` field. The restaurants fetch adds `rich_content` to its select clause. The field threads through unchanged into the `BallotRow` component.

In `VoteForm`, add:
```ts
const [expanded, setExpanded] = useState<Set<string>>(new Set())
```
and render each item by composing the shared `<BallotRow>` inside the existing `<label>`. The Details button's `onToggleExpanded` toggles the restaurant id in this set.

Type-check invariant: when `rich_content === null`, `BallotRow` falls back to today's anatomy (name + banked chip + DoorDash link + notes, no thumbnail, no meta, no expand button). This guarantees that un-imported restaurants render visually identically to today — bit-exact pixel diff expected in the "no rich_content" screenshot test.

## Test plan

**Type-check and lint** (`pnpm type-check`, `pnpm lint`) after each major file batch.

**Unit test the decoder**
- Known-good prefill from a captured Tasty Pot payload → returns expected `DecodedPrefill`.
- Missing `rich_content.version` → returns `null`.
- `version: 2` → returns `null` (future-safe).
- Non-DoorDash `source_url` → returns `null`.
- Malformed base64 → returns `null`.
- Empty `name` → returns `null`.

**Bookmarklet unit test**
- Capture Tasty Pot page HTML (via Playwright `page.content()` against the live page) → extract JSON-LD blocks → feed to the bookmarklet logic (run in a Node context with stubbed `document.querySelectorAll`, `window.open`, `alert`, `btoa`, `location`). Assert the generated prefill URL decodes to the expected `DecodedPrefill`.

**End-to-end via Playwright MCP**
1. Navigate to Tasty Pot DoorDash page. Use `browser_evaluate` to run `BOOKMARKLET_SOURCE` (with `${REVIA_ORIGIN}` replaced to `http://localhost:3000`). Capture the URL passed to `window.open`.
2. Open that URL in the same browser context. Assert `/admin/restaurants/new` renders with name = "Tasty Pot 味鼎", preview card shows cover thumbnail + cuisines + price + menu items.
3. Click Save. Assert redirect to `/admin/restaurants/:id`, rich-content card renders.
4. Navigate to an actual poll page that includes this restaurant (seed or manually add to a template). Assert the ballot row shows thumbnail + meta line + Details button. Click Details → expand reveals menu items.
5. Add a second restaurant via the manual `AddRestaurantModal` (no rich_content). Add it to the same template. Assert the ballot shows both rows — enriched + plain — rendering cleanly side by side.
6. On the enriched row, click the checkbox → autosave fires as expected (no regression on gap #1).
7. Click Details on the enriched row → checkbox does NOT toggle (propagation stopped).
8. Admin detail page: click Clear rich content → confirm modal → rich-content card disappears; ballot rows revert to plain anatomy.

**Screenshots to verify (responsive):**
- Ballot with mix of enriched + plain rows at 390px (mobile) and 1440px (laptop).
- Details expand at both widths.
- Install card at both widths.
- Admin `/new` preview.

All PNGs capped to ≤2000px per the AGENTS.md constraint (use explicit clip + `scale: 'css'`).

## Rollback

- Revert code.
- `alter table restaurants drop column rich_content;` — no other dependencies.
- Remove `decodePrefill` and the bookmarklet source file — no external consumers.

## Open questions / future

- **Size-overflow fallback (form POST).** Designed in requirements, not implemented. Wait until a real restaurant trips 7500 chars.
- **Re-import button that actually refreshes data.** Would require re-running the bookmarklet — cross-origin, admin-driven, can't be automated from our side. Current "hint to re-run it" approach is honest about that.
- **Menu item images on the ballot.** DoorDash JSON-LD often provides per-item images. We store them but only render on the admin detail page. Could add per-item thumbnails to the ballot expand; low priority.
- **Favoriting / ordering of menu items.** We store top-10 as given by DoorDash. Admin can't curate. Out of scope.
