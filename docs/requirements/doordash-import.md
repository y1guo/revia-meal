# Requirements — DoorDash import + rich restaurant content (gaps #7 + #8)

Combines gaps #7 ("add restaurant by DoorDash link") and #8 ("rich restaurant content") from [feature_gaps.md](../../feature_gaps.md). Supersedes [doordash-parsing-research.md](./doordash-parsing-research.md), which recommended a server-side OG-tag fetch — that plan is abandoned because plain HTTP requests to doordash.com are blocked by Cloudflare's anti-bot challenge (verified via Playwright 2026-04-20), and Vercel Hobby's 10s function timeout makes server-side Chromium unreliable.

## Goals

- Admin pastes a DoorDash restaurant URL once, and the restaurant catalog entry is populated with name, DoorDash URL, and a rich payload (description, cuisines, price range, rating, cover image, top menu items).
- Voters on the poll page see richer restaurant context inline on the ballot without sacrificing voting speed.
- Admin detail page shows the full stored payload read-only, so admins can verify what was captured.

## Non-goals

- **No server-side scraping of doordash.com.** Cloudflare blocks curl; Vercel Hobby's 10s function timeout is too tight for `@sparticuz/chromium` cold start + page render. Moved out of scope.
- **No non-DoorDash sources.** The bookmarklet is DoorDash-only. Grubhub/Uber Eats/manual entry stays manual.
- **No re-fetch / sync.** The payload is a snapshot taken at import time. If DoorDash changes the menu or price, admins re-import by re-clicking the bookmarklet on the updated page.
- **No menu-level selection or ordering integration.** We show a preview of menu items; we don't let voters pick one, nor do we place any order.
- **No image rehosting.** We store CDN URLs from DoorDash directly. If DoorDash rotates an image URL, it goes stale. Acceptable for a 15-person internal app.
- **No hours data.** JSON-LD does not include weekly open hours reliably, so the hours editor from gap #5 remains the source of truth.
- **No backfill of existing restaurants.** Pre-live; seed data is disposable.

## Approach — bookmarklet pattern

**Why bookmarklet wins over server-side parsing** (recap from 2026-04-20 research):

- **Plain `curl`** — Cloudflare returns a 7.5KB "Just a moment…" challenge page. No content to parse.
- **Iframe embedding** — blocked by `X-Frame-Options: DENY` / CSP `frame-ancestors 'none'`.
- **Cross-origin `fetch` from admin's browser** — blocked by CORS.
- **Server-side headless Chromium** — technically works (verified with Playwright), but cold start + Cloudflare challenge + page render is 5–10s against Vercel Hobby's 10s timeout. Flaky, and it's the kind of flaky that fails in production and works locally.
- **Bookmarklet** — runs in DoorDash's own origin (same-origin to the page the admin is viewing). CORS and X-Frame don't apply. DOM access is trivial. Zero server infra, zero ongoing cost. Tradeoff: admin installs the bookmarklet once, as a drag-to-bookmarks-bar link. One bookmarklet works for every DoorDash restaurant page forever — the script is generic and reads whatever page is open.

## Behavior

### Data model

One new column on `restaurants`:

```sql
alter table restaurants add column rich_content jsonb;
```

- `null` = no rich content imported (the existing manual-entry path).
- Non-null = snapshot from the bookmarklet at `fetched_at`.

No separate table. JSONB matches the "snapshot at a point in time" pattern that works well for immutable imported data, and it lets the schema evolve (bookmarklet version 2 can add fields without migration).

### Rich content shape

```ts
export type RichContent = {
    version: 1
    source: 'doordash'
    source_url: string          // the DoorDash page URL the admin imported from
    fetched_at: string          // ISO timestamp when the bookmarklet ran
    description: string | null  // from og:description or JSON-LD Restaurant.description
    cuisines: string[]          // JSON-LD servesCuisine; [] if absent
    price_range: string | null  // "$", "$$", "$$$", …; from JSON-LD priceRange
    rating: {                   // from JSON-LD aggregateRating
        value: number           // e.g. 4.5
        count: number           // number of reviews
    } | null
    cover_image_url: string | null   // og:image (cover_square on DoorDash) — used for ballot thumbnail
    hero_image_url: string | null    // larger landscape variant from JSON-LD image[] — used on admin detail
    address: string | null           // formatted address from JSON-LD address
    menu_items: Array<{              // top ~10 from JSON-LD hasMenu.hasMenuSection.hasMenuItem
        name: string
        description: string | null
        price: string | null         // localized string "$12.95" — stored as-is; see "Menu prices" below
        image_url: string | null
    }>
}
```

Shape is **typed and versioned**, not raw JSON-LD. The bookmarklet does the JSON-LD → normalized transform, so rendering code on the server and client never does schema archaeology. `version: 1` lets us evolve later without breaking old rows.

### The bookmarklet

A small, generic JS snippet distributed from `/admin/restaurants` as a drag-to-bookmarks-bar `javascript:` link. When clicked on a DoorDash restaurant page:

1. Find `<script type="application/ld+json">` blocks; pick the one whose parsed content has `@type === "Restaurant"` (there's usually one Restaurant block + a Menu block + a FAQPage block).
2. Read `og:image`, `og:description`, `og:title` meta tags as fallbacks / supplements.
3. Normalize into the `RichContent` shape above (version 1). Also extract `name` (from `Restaurant.name`, preserves native characters like "味鼎") and `doordash_url` (strip the current `location.href` to canonical form: origin + pathname, no query/fragment).
4. Build a payload object `{ name, doordash_url, rich_content: RichContent }`, `JSON.stringify` → base64 → URL-encode.
5. Open `/admin/restaurants/new?prefill=<base64>` on the revia-meal origin in a new tab.

If JSON-LD is missing (unusual DoorDash page template) or the base64 payload exceeds ~7500 chars, the bookmarklet shows an `alert()`: "Couldn't read this DoorDash page" / "Too much data — add manually instead" and doesn't open the tab. Graceful failure; nothing silent.

### Install UI on `/admin/restaurants`

New card section above the `RestaurantsTable`, sibling to the page header. The existing `AddRestaurantModal` (triggered by the "Add restaurant" button on the table's trailing area) stays as the quick manual-add path — the bookmarklet is additive.

- Heading: **Import from DoorDash**
- One-line explainer: "Drag this button to your bookmarks bar, then click it from any DoorDash restaurant page."
- A draggable anchor styled as a button: `<a href="javascript:(…)">Add to revia-meal</a>`. The `href` contains the minified bookmarklet source. Visual label matches the `Button` primitive in the app but with a small bookmark icon so the drag target reads as "bookmarklet" not "regular button."
- A small helper: "Works on any DoorDash restaurant page. Data you see before clicking save is a preview — you can edit anything." with a `Learn more →` link pointing to `/docs` anchor (docs page itself is post-MVP per brief §5.12; link is safe to add now and the anchor will resolve later).

No install-tracking, no "you've already installed this" detection (not possible cross-origin). Admin just drags it; it works.

### New page — `/admin/restaurants/new`

A dedicated review-import page. **Prefill-required** — the route only exists to host the import-review UX. Visiting without `?prefill=` redirects back to `/admin/restaurants`. Manual adds keep using the existing `AddRestaurantModal`; we don't want two manual paths.

Page layout:

- **Heading**: "Import from DoorDash"
- **Prefill banner**: "Imported from DoorDash — review and edit before saving." + the source URL as a small clickable link (opens in new tab).
- **Standard fields**: name, doordash_url, notes, is_active — pre-filled from the decoded payload. `notes` is left blank for the admin to author (it's their internal memo, not something DoorDash provides).
- **Rich content preview section**: a card rendering the ballot-row preview exactly as it will appear on the poll page (thumbnail + meta line + expand-to-see-details). This is the "this is what voters will see" moment. Read-only — admin can't individually edit menu items. Below the preview, a collapsible raw-JSON view so admins can eyeball the stored payload if the preview looks off.
- **Save button**: inserts the row. Server action validates, writes. Redirect to `/admin/restaurants/:id` on success.
- **Cancel link**: back to `/admin/restaurants`.

Decoding the prefill happens server-side (in the page component) to avoid shipping base64 decode logic to the client; malformed prefills render a friendly error card with a "Back to restaurants" link, not a crash.

### Poll ballot — rendering rich content

The vote form on `/polls/:id` (Open state) already shows one row per restaurant with checkbox + name + notes + DoorDash link. The row gets denser and gains an opt-in expand affordance:

**Default row anatomy (mobile + desktop):**

| Zone | Content |
|---|---|
| Checkbox | 44px tap target, left (unchanged) |
| Thumbnail | 48–56px square from `cover_image_url`; monogram-based placeholder when absent |
| Header line | Restaurant name (primary), `Removed` chip if disabled, `BankedCreditChip` if applicable |
| Meta line | `Chinese · $$ · ★ 4.5` — cuisines (joined with `·`), price range, rating; each segment rendered only if present. Muted color. Gracefully absent entirely when `rich_content` is null. |
| Details button | `Details ▾` button at row end, opens the expand. `<button>` stops propagation so the surrounding `<label>` doesn't toggle the checkbox. |

The `BankedCreditChip` stays in the header row (not moved to the meta line) — design brief §4.1 requires banked credits feel natural and visible, not buried.

**Expanded peek (inline below the row, animates open):**

- Cover image (hero variant if present, else cover), ~160px tall, cropped with object-fit: cover.
- 1–2-sentence description.
- Top 5 menu items as a 2-column compact grid: name + price on one line, description truncated to one line underneath. Small image thumbnail if the item has one.
- Footer: `Menu prices and details on DoorDash ↗` — replaces the today's inline DoorDash link when rich_content is present. (Rows without rich_content keep the old inline DoorDash link on the header line for parity.)
- Notes (admin-entered) move into the expand if rich_content is present; stay in the row otherwise.

**Menu item prices** are stored and displayed as-is (localized strings like "$12.95"). DoorDash's listed prices include marketplace markup; the inline footer "Menu prices and details on DoorDash ↗" signals that the prices are DoorDash's, not what the restaurant charges directly. We don't strip or recalculate.

**Voter UX invariants (preserved):**

- Voting by tap-anywhere on the label still works; the Details button is the only thing inside the row that doesn't toggle.
- Mobile one-hand reach: expand grows the row vertically but doesn't push controls off-screen dangerously; scrolling is preserved.
- Disabled rows (from gap #3) get the rich-content treatment but still render muted; the expand is available (reading about a removed option isn't harmful) but the checkbox stays locked per gap #3 rules.
- Graceful fallback: rows with no rich_content render exactly like today — no thumbnail, no meta line, DoorDash link and notes on the header row, no Details button. One codepath, conditional rendering inside.

### Admin detail page — `/admin/restaurants/:id`

The existing detail page gains a "Rich content" card below the hours editor when `rich_content` is non-null:

- Cover thumbnail, cuisine chips, price, rating.
- Full description (not truncated).
- Menu items as a vertical list (not the compact grid) — all ~10, with prices and descriptions.
- `Source: <doordash_url>` + `Fetched <relative-time>`.
- `Re-import from DoorDash` button (hint text: "Click the bookmarklet on the DoorDash page to refresh"). It doesn't actively re-fetch — it just reminds the admin what to do.
- `Clear rich content` button (danger-ghost) for when the data is stale or wrong. Confirms via the shared `DestructiveConfirmModal`; on confirm, sets `rich_content = null`. Manually editable raw-JSON is out of scope.

### Server actions

Two additions to `app/admin/restaurants/actions.ts`, plus a pure decoder:

```ts
// Decodes + validates prefill payload. Used by the /new page renderer.
// Pure function, not a server action — lives alongside actions.ts or in a lib file.
export function decodePrefill(raw: string): { name: string; doordash_url: string | null; rich_content: RichContent } | null

// Existing `addRestaurant` stays. For the import flow we add a distinct action
// that also writes rich_content. Two actions (rather than one overloaded) because
// the form shapes differ: AddRestaurantModal submits 3 fields; the /new page
// submits 4 + a base64 rich_content blob.
export async function addRestaurantFromImport(formData: FormData): Promise<void>

// Nulls rich_content on an existing row.
export async function clearRestaurantRichContent(formData: FormData): Promise<void>
```

Validation inside the decoder:

- Payload must be base64-decodable JSON.
- Must parse as `{ name: string, doordash_url: string, rich_content: { version: 1, ... } }`.
- `name` is non-empty.
- `doordash_url` starts with `https://www.doordash.com/`.
- All `rich_content` fields are type-checked against the RichContent type. Unknown fields are dropped silently (forward-compat).
- On any failure, decoder returns `null`; the page renders a "Could not decode the imported data. Please try again or add manually." error card.

### Bookmarklet source

Kept in a single file `lib/bookmarklet/source.ts` (TypeScript-authored, compiled to a plain-IIFE string at build time, minified). Why a TS source: type-check the JSON-LD shape the parser depends on, keep the code maintainable, run unit tests against it with a mock page DOM. Why a single file: bookmarklets have no module system.

Build output is a string constant available to the install-card component. The `<a href="javascript:…">` interpolates the minified source at render time. No runtime evaluation on our side.

## Edge cases

- **DoorDash changes markup**: the parser reads JSON-LD, which is standardized and a stable public surface (it feeds Google rich results, Slack unfurls, etc.). Much stabler than scraping app-specific classNames. If a specific field goes missing, the parser returns `null` for it and the UI gracefully hides that segment.
- **Base64 payload exceeds URL cap (~8000 chars)**: bookmarklet detects this before opening the tab, shows `alert()`. A form-POST fallback is designed but not built — the expected payload size (~3–4KB for 10 menu items) is well under budget; we'll revisit if a real restaurant ever trips it.
- **Admin clicks the bookmarklet off a non-DoorDash page**: bookmarklet checks `location.hostname` matches `doordash.com` first. If not, `alert()` "This bookmarklet only works on DoorDash restaurant pages."
- **Admin clicks bookmarklet on a DoorDash *search result* or home page**: no `@type === "Restaurant"` JSON-LD block → parser returns null → `alert()` "Open a specific restaurant's page and try again."
- **Duplicate DoorDash URL**: server insert doesn't check for duplicates. Admin reviews in the preview, sees they already added this restaurant, cancels out. No schema constraint on `doordash_url` uniqueness — different URLs can legitimately map to the same physical restaurant (old vs new slug, different cities), so unique constraints would be wrong.
- **Native characters in name**: JSON-LD `Restaurant.name` is UTF-8; base64 of JSON.stringify handles it cleanly. The Tasty Pot test case ("味鼎" in the name) is the validation fixture.
- **Voter clicks `Details ▾` mid-vote**: the button stops propagation, so the checkbox doesn't toggle. Expand opens, vote state unchanged. Autosave not triggered.
- **Mobile expand makes row unreasonably tall**: expanded content is capped at ~400px with internal scroll if menu is long. Rare — top-5 items usually fit.

## Success criteria

- Admin drags the bookmarklet to the bookmarks bar, navigates to Tasty Pot's DoorDash page, clicks the bookmarklet. A new tab opens at `/admin/restaurants/new?prefill=…` with the fields pre-filled including name (with Chinese characters intact), DoorDash URL, cover image thumbnail visible, cuisines/price/rating rendered in the preview, and top menu items listed.
- Admin saves. Restaurant appears in the catalog with `rich_content` populated. `/admin/restaurants/:id` shows the full rich-content card.
- A poll that includes this restaurant renders the ballot row with thumbnail + meta line + Details button. Clicking Details expands an inline panel with description, top items, and the DoorDash link.
- Restaurants without rich_content (catalog entries added via the old manual form) render exactly as they do today — no thumbnail, no meta line, no expand button. One ballot renders a mix of enriched and plain rows cleanly.
- Bookmarklet gracefully refuses on non-DoorDash pages, non-restaurant DoorDash pages, and oversized payloads.
