# Page layouts & states

Page-by-page implementation spec. Plays the role a Figma L1 greybox would — section order, responsive rules, state variations, concrete copy. Reference [tokens.md](tokens.md) for colors/typography and [components.md](components.md) for every primitive used below.

Read [../design-brief.md](../design-brief.md) §5 first if you haven't — this doc is the implementation-layer complement, not a replacement.

---

## Resolved decisions

Product owner signed off on the following (2026-04-19):

1. **Aesthetic direction — Fresh Market confirmed.** The palette is deliberately pan-cuisine: saffron, sage, tomato, indigo are food-adjacent but not regional. Works for any DoorDash pick.
2. **Admin index — stats dashboard.** See `/admin` section below. Recent-activity feed is behind a flag so we can hide it if the query turns expensive.
3. **Docs route — `/docs`.** Users are software engineers; "docs" reads correctly and doesn't need a rename.
4. **Logo — placeholder wordmark for now.** Fraunces 600 with the saffron-plate interpunct, per direction.md §13.
5. **Mobile admin — full redesign for mobile.** No artificial simplification; every admin control works on mobile, but with mobile-native patterns (stacked cards, dropdown sub-nav) instead of shrunken desktop layouts.
6. **Time copy — both relative and absolute.** "Closes in 42m · 11:30 AM" style. Applied throughout the poll states below.
7. **Dashboard Open-state metadata — "N have voted".** Without the allowlist-size denominator (which isn't always meaningful). Just a participation count.

## Outstanding TODOs

Tracked for later, not blocking Wave 1:

- [ ] **Illustration filenames.** Every `*.svg` referenced in this doc (`lunch-together.svg`, `calendar-empty.svg`, `coins-stacking.svg`, `trophy.svg`, `people-spectrum.svg`, …) is a *placeholder subject-description*, not a real Storyset asset. Before each screen ships, match to an actual Storyset "Food & Drink" asset, recolor per [direction.md §4](direction.md), and rename the reference in this doc at the same commit. Search this doc for `.svg` to find all occurrences.
- [ ] **Accessibility audit.** After Wave 1 lands, verify contrast + focus rings across every token pair in both themes.
- [ ] **Copy tone pass.** Empty-state and modal copy drafted inline below is a first draft; revisit once screens are live.
- [ ] **Final 12-hue restaurant sub-palette** for the flavor bar on `/people`. Lock during Wave 2.

---

## Shared shell

Applied to every authenticated route (everything except `/login`). Spec is the `AppShell` component in [components.md](components.md).

- Desktop (`≥md`): TopNav (sticky), then `<main>` container, then page body.
- Mobile (`<md`): slim TopNav (brand left, AvatarMenu right), then `<main>`, then fixed BottomTabs at bottom.
- Surface background: `bg-[var(--surface-base)]`.
- Container max-width varies per page — see §"Container rules" below.
- `PageHeader` is the first child of every page.

### Container rules (brief §7 × direction.md §11)

| Page | Mobile | Laptop (≥md) | Large desktop (≥2xl) |
|---|---|---|---|
| `/` | full, 16px sides | `max-w-[1200px]` centered | `max-w-[1200px]` |
| `/polls/[id]` | full | `max-w-[880px]` (reading width) | `max-w-[880px]` |
| `/history` | full | `max-w-[1200px]` | `max-w-[1400px]` (2-col rows) |
| `/people` | full | `max-w-[1400px]` | `max-w-[1600px]` |
| `/settings` | full | `max-w-[720px]` | `max-w-[720px]` |
| `/docs` | full | `max-w-[1100px]`, 260px TOC + prose | same |
| `/admin/*` | full | `max-w-[1100px]` | `max-w-[1100px]` |

Padding inside the container: `px-4 md:px-6 2xl:px-8`. Page top padding `pt-6 md:pt-10`.

### Copy tone (brief §6.7)

Direct, slightly dry, occasional playful edge. Never corporate-speak. Empty-state copy prefers a light human touch ("No one's voted yet — you could be first.") over clinical ("0 votes.").

---

## `/login`

Only unauthenticated page. The one screen that gets a small hero.

### Layout

```
┌──────────────────────────────────────────────┐
│                  revia · meal                │  ← brand wordmark (Fraunces, saffron interpunct)
│                                              │
│   [Storyset illustration — 180×180           │
│    monochrome saffron, food-themed]          │
│                                              │
│        Lunch, decided together.              │  ← tagline, Fraunces 500, 1.25rem
│                                              │
│   [  Sign in with Google  ]                  │  ← lg primary button, G logo left
│                                              │
│   Only emails on the office allowlist        │  ← text-secondary, 0.8125rem
│   can sign in.                               │
│                                              │
│   (error slot)                               │  ← tomato, appears on bounce-back
└──────────────────────────────────────────────┘
```

### Details

- Centered vertically and horizontally on the viewport.
- Max content width 400px on mobile, 480px on laptop.
- No TopNav, no BottomTabs.
- Background: `bg-[var(--surface-base)]`.
- Theme toggle (small, icon-only, absolute top-right) so people can flip before signing in. Uses `ThemeToggle` icons-only variant.
- Error cases (brief §5.1):
  - `?error=not_allowed` → "This email isn't on the office allowlist. Ask an admin if you think that's a mistake."
  - `?error=deactivated` → "Your account is deactivated. Reach out to an admin."
  - `?error=oauth` → "Something went wrong with Google sign-in. Try again."
- Errors render in a tomato callout card above the button (not below — user sees it before next click).

### Illustration

Storyset: `lunch-together.svg` or similar food-and-people scene, recolored saffron on cream. 1 asset.

---

## `/` — dashboard (today's polls)

The landing view. First impression sets the tone (brief §11 #1).

### Layout (laptop)

```
┌─────────────────────────────────────────────────────────────┐
│ TopNav                                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Today's polls                                              │  ← PageHeader title (Fraunces)
│  Tuesday, April 21                                          │  ← subtitle, text-secondary
│                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐       │  ← 2-col grid
│  │ Lunch       [OPEN]    │  │ Happy Hour  [SCHED]   │       │     gap-6
│  │ Closes in 42m·11:30AM │  │ Opens at 4:00 PM      │       │
│  │                       │  │                       │       │
│  │ 3 have voted          │  │ Ballot ready          │       │  ← optional metadata line
│  └───────────────────────┘  └───────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Card anatomy (reused by each entry)

- `Card` wrapper, behaves as a `Link` (hover lift).
- Header row:
  - Left: template name (Fraunces 500, 1.125rem).
  - Right: `StatusBadge`.
- Subtitle (text-secondary, 0.8125rem): contextual, relative + absolute when both inform:
  - Open (imminent): `Closes in 42m · 11:30 AM`
  - Scheduled (today): `Opens in 23m · 10:00 AM`
  - Scheduled (far): `Opens at 4:00 PM` (relative dropped when >3h — reads as noise)
  - Closed: `Closed`
  - Cancelled: `Cancelled (no votes)` or `Cancelled by admin`
- Optional description (from template, text-tertiary 0.8125rem).
- Optional metadata line:
  - **Open**: "N have voted" (no denominator — we don't have a meaningful "expected voters" count per poll). Singular: "1 person has voted." Zero: the line is omitted rather than "0 have voted" — empty state carries the signal.
  - **Closed**: "Won: Chipotle" (winner-name, subtle saffron accent).
  - **Cancelled**: inherits subtitle; no extra line.
  - **Scheduled**: "Ballot: Chipotle · Sweetgreen · Sushi Ya" (first 3 names, "…+N more" if longer).
- Entire card clickable → `/polls/{id}`.

### Responsive

- Mobile: single column, cards full-width, 12px gap.
- Laptop: 2 columns when ≥2 cards, single column if only 1 card (don't orphan a half-row).
- Large desktop: still 2 columns, container max-width keeps cards from stretching; do **not** go to 3 columns — typical case is 1–2 polls per day.

### Empty state (no polls today)

- Use `EmptyState` primitive.
- Storyset illustration: `calendar-empty.svg` (or similar), saffron tint.
- Title: "Nothing on the menu today."
- Body: "No templates are scheduled for today. Ask an admin to activate one whose schedule includes today — or check back tomorrow."
- No CTA button (user can't create polls themselves).

### Motion

- Cards stagger in on mount: 0→1 opacity + 8px translateY, 40ms stagger, 240ms each, ease-out-quart.
- Reduced motion: plain fade, no translate.

---

## `/polls/[id]` — the five states

The workhorse page. Reading-width container (880px max). Uses `PageHeader` with:
- Title: template name.
- Subtitle: formatted date + local time + timezone (e.g. "Tuesday, April 21 · 10:00 AM–11:30 AM PT").
- Right slot: `StatusBadge` (not in header action — place at end of subtitle line so it flows like metadata).

Above the `PageHeader`, a subtle "← Today's polls" breadcrumb link (utility style). On `/admin/polls` entry, link reads "← All polls".

### 5.1 Scheduled

```
┌───────────────────────────────────────────────┐
│ Lunch                                         │
│ Tue Apr 21 · 10:00 AM–11:30 AM PT  [SCHED]    │
│                                               │
│ Opens in 23m · 10:00 AM                       │  ← relative + absolute, relative auto-updates
│                                               │
│ Ballot preview                                │  ← section label (Fraunces 500, 1rem)
│ ─────────────────────────────────────────     │
│ · Chipotle                                    │
│ · Sweetgreen                                  │
│ · Sushi Ya                                    │
│ · Thai Town                                   │
│                                               │
│ You'll be able to vote when it opens.         │  ← text-secondary
└───────────────────────────────────────────────┘
```

- Ballot items: plain list, 12px vertical rhythm, 1.5px left border accent (saffron-500/30) for visual quietness.
- DoorDash links / notes on restaurants are NOT shown pre-open to keep the preview clean; shown inside the voting form.
- Copy format: **relative + absolute**. When relative is informative, pair it with the absolute time after a `·` separator. Examples:
  - `Opens in 23m · 10:00 AM` (approaching)
  - `Opens at 10:00 AM tomorrow · in 18h` (far out)
  - Relative segment auto-ticks client-side (30s interval is fine; no need for per-second).

### 5.2 Open — normal

```
┌─────────────────────────────────────────────────────┐
│ Voting is open. Closes in 42m · 11:30 AM.           │  ← Fraunces 500, sage accent on "open"
│                                                     │
│  ┌─ Pick your restaurants ────────────────────┐     │
│  │                                            │     │
│  │ ☐  Chipotle                                │     │
│  │    DoorDash ↗                              │     │
│  │    Gluten-free options available.          │     │
│  │                                            │     │
│  │ ☑  Sweetgreen   [🪙 +0.5 banked]            │     │
│  │    DoorDash ↗                              │     │
│  │                                            │     │
│  │ ☐  Sushi Ya                                │     │
│  │    DoorDash ↗                              │     │
│  │                                            │     │
│  │ ☑  Thai Town   [🪙 +1.0 banked]             │     │
│  │                                            │     │
│  └────────────────────────────────────────────┘     │
│                                                     │
│  You picked 2 · each counts as 0.5 credit           │  ← live preview, mono font
│  [  Submit vote  ]                                  │  ← lg primary button
│                                                     │
│  ℹ How banked credits work                          │  ← small InfoIcon link to /docs
└─────────────────────────────────────────────────────┘
```

- Each row is a `<label>` wrapping the Checkbox + content so the whole row is tappable. Hover: row background → `bg-[var(--surface-raised)]`.
- Row layout:
  - Left: Checkbox (18px), aligned top.
  - Right: vertical stack — **line 1**: restaurant name (weight 500) + `BankedCreditChip` trailing the name (flex row, `gap-2`, wraps below the name on narrow widths via `flex-wrap`). **Line 2** (optional): DoorDash link, if the restaurant has one. **Line 3** (optional): notes (`text-secondary`, 0.8125rem). Restaurants with no DoorDash and no notes collapse to just line 1.
- DoorDash link: "DoorDash ↗" small inline link, utility color. Only rendered when the restaurant has a URL.
- Live preview: `text-[var(--text-secondary)]`, 0.875rem. Updates on checkbox change without re-render thunder. On 0 picks: "Pick at least one restaurant to submit."
- Submit: disabled when 0 picks; spring-pop animation on submit (framer-motion scale 1→1.05→1, 180ms).
- On submit success: row border briefly pulses saffron (600ms), no toast (brief §6.5 forbids).
- Existing picks are pre-checked on reload (form is idempotent — submitting replaces).
- `aria-live="polite"` region announces "Vote recorded. 2 picks, 0.5 each."

### 5.3 Open — conflict (already voted in another template today)

Replaces the form. Brief §5.3.

```
┌─────────────────────────────────────────────────────┐
│ [Storyset: calendar-locked.svg — 120×120]           │
│                                                     │
│ You've already voted in "Happy Hour" today.         │  ← Fraunces 500, 1.125rem
│                                                     │
│ You can only participate in one poll per day.       │  ← text-secondary
│ Your pick there: Sushi Ya, 1.0 credit.              │  ← if data available
│                                                     │
│ [  View "Happy Hour" poll  ]                        │  ← secondary button → /polls/{otherId}
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 5.4 Pending close (rare, transient)

```
┌─────────────────────────────────────────────────────┐
│ [tiny spinner] Finalizing…                          │
│                                                     │
│ The voting window ended a moment ago.               │
│ Refresh in a second — results are being tallied.    │
│                                                     │
│ [  Refresh  ]                                       │  ← secondary button, reloads
└─────────────────────────────────────────────────────┘
```

- On mount, trigger the finalization server action (it runs on first visit per brief §4.2). After action completes, rerender to Closed state.
- Auto-refresh after 2 seconds if the mount-effect hasn't transitioned (defensive).

### 5.5 Closed

The celebratory reveal moment (brief §11 #3, direction.md §9).

```
┌───────────────────────────────────────────────────────┐
│ Closed 12m ago · 11:30 AM.                            │
│                                                       │
│  ┌─ 🏆 Sweetgreen ─────────────────────────┐          │  ← winner row, saffron-tinted
│  │ DoorDash ↗ · Salads & grain bowls.     │          │     border-2, scale-pop on reveal
│  │                                         │          │
│  │ today 2.0 + banked 0.5 = total 2.5     │          │  ← font-mono tabular-nums
│  │                                         │          │
│  │ Voters: Alice (1) · Bob (0.5) ·         │          │  ← chip row, 24px avatars + name + weight
│  │         You (0.5) · Carol (0.5)         │          │
│  └─────────────────────────────────────────┘          │
│                                                       │
│  Chipotle                                             │  ← non-winner rows, neutral surface
│  today 1.5 + banked 0 = total 1.5                     │
│  Voters: Dan (1) · Eve (0.5)                          │
│                                                       │
│  Sushi Ya                                             │
│  today 0.5 + banked 0 = total 0.5                     │
│  Voters: Frank (0.5)                                  │
│                                                       │
│  Thai Town                                            │
│  no votes today                                       │
│  (no voter row rendered)                              │
│                                                       │
└───────────────────────────────────────────────────────┘
```

- Winner row:
  - Background `bg-saffron-500/10` (dark: `bg-saffron-500/14`).
  - 2px `border-saffron-500/40` border, `rounded-lg`.
  - Winner badge = Lucide `Award` or custom trophy glyph, 20px, saffron.
  - Restaurant name Fraunces 500, 1.125rem.
- Tally line: mono font, tabular nums, text-secondary but "total T" is text-primary weight 500 for emphasis.
- Voter list:
  - Wrapping chip row. Each chip = 24px Avatar + display name + `(0.5)` weight in mono.
  - Current user's chip: display name is replaced with literal `You` (per [brief §5.3](../design-brief.md) voter-list example) and gets a saffron ring border for emphasis.
  - On high-participation days, chips wrap naturally; row gap 8px, inside-chip gap 4px.
- Non-winner rows:
  - Same structure minus the winner framing; plain `bg-[var(--surface-raised)]`.
- Sort: winner first, then by total desc.

### Reveal motion (first visit only)

Per direction.md §9. Detection: if navigation came from an "open" state (session storage) OR `closed_at` within last 120 seconds AND no `reviewed` flag in sessionStorage for this poll id.

1. Rows fade + rise 12px, 40ms stagger, ease-out-quart.
2. Winner row scale 1.00 → 1.02 → 1.00 over 280ms.
3. Winner background warms simultaneously (saffron tint + subtle `box-shadow` glow, 400ms fade-in, lingers).
4. Paper-petal overlay — 6–10 soft shapes drift across the card once, ~700ms total. Pointer-events none. `prefers-reduced-motion` skips entirely.
5. Banked-credit chips count 0 → their value over 400ms with a soft glint.
6. Set `sessionStorage['poll:<id>:reviewed'] = '1'` to skip next time.

Reduced motion: plain fade of the whole block, no reveal sequence.

### 5.6 Cancelled

```
┌─────────────────────────────────────────────────────┐
│ Cancelled by an admin.                              │  ← or "Cancelled because no one voted."
│                                                     │
│ Ballot                                              │
│ ─────────────────────────────────                   │
│ · Chipotle            [you voted]                   │  ← chip if current user voted
│ · Sweetgreen                                        │
│ · Sushi Ya                                          │
│                                                     │
│ No tallies shown — this poll was nullified          │  ← text-tertiary, 0.8125rem
│ so credits weren't consumed.                        │
└─────────────────────────────────────────────────────┘
```

- Brief §5.3 cancelled state: no tallies or voter lists rendered (even if the DB snapshot has them) because the poll is nullified.
- "you voted" chip = neutral Chip variant.

---

## `/history`

Filterable list of past polls. Brief §5.4.

### Layout (laptop)

```
┌───────────────────────────────────────────────────────┐
│ History                                               │
│ Browse closed and cancelled polls.                    │
│                                                       │
│ ┌─ Filters (collapsible on mobile) ──────────────┐    │
│ │ Template ▾  From [date] To [date]  Status ▾    │    │
│ │ Winner ▾    Participant ▾          [Apply]     │    │
│ └────────────────────────────────────────────────┘    │
│                                                       │
│ ┌─ Sat Apr 18, 2026 ───────────────────────────────┐  │  ← row = link Card
│ │ Lunch    [CLOSED]   14 voters  ·  Won: Chipotle  │  │
│ └──────────────────────────────────────────────────┘  │
│ ┌─ Fri Apr 17, 2026 ───────────────────────────────┐  │
│ │ Lunch    [CANCELLED]  Cancelled by admin         │  │
│ └──────────────────────────────────────────────────┘  │
│ ┌─ Thu Apr 16, 2026 ───────────────────────────────┐  │
│ │ Happy Hour  [CLOSED]   6 voters  ·  Won: Sushi Ya│  │
│ └──────────────────────────────────────────────────┘  │
│                                                       │
│ [1 2 3 … ]                                            │  ← optional pagination
└───────────────────────────────────────────────────────┘
```

### Filters

- Submit via GET so URL is shareable (brief §5.4).
- `Template` / `Status` / `Winner` / `Participant` are Select components.
- `From` / `To` are a DateRangeField, defaulting to last 30 days.
- On mobile: filter bar collapses to a single "Filters (N active)" Chip button that opens a bottom-sheet modal with all filters stacked.
- Empty "active filter chips" row appears below the filter form when any filter is non-default — each chip has a close × to clear just that one.

### Row

- Card-like row, `rounded-lg`, hoverable.
- Date = Fraunces 500 / label; template + StatusBadge + metadata on the right.
- At `2xl` viewports, rows become a 2-column grid (bento feel). At laptop/mobile, single column.

### Empty state

- Illustration: `search-empty.svg`, sage tint.
- Title: "No polls match these filters."
- Body: "Try widening the date range, or clear filters to start over."
- CTA: ghost "Clear filters" button that resets the URL params.

---

## `/people` — flavor spectrum

The most visually differentiated page (brief §11 #4, direction.md §8).

### Layout

```
┌──────────────────────────────────────────────────────────┐
│ People                                                   │
│ Who's been feeling what, across the last 30 days.        │
│                                                          │
│ Date range: [Mar 22 – Apr 21]   View: [Spectrum][Details]│  ← right-aligned toggle
│                                                          │
│ ┌─ The office ────────────────────────────────────────┐  │  ← collective bar
│ │ [██Chipotle██|█Sweetgreen█|██Sushi Ya██|█Thai█|…]   │  │     one stacked bar
│ │ 14 people · 32 polls · 96 credits                   │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                          │
│ ─── Alice ────────────────────────── 18 polls · 14 cr    │
│ [████Chipotle████|███Sweetgreen███|██Thai██|…]           │
│                                                          │
│ ─── Bob ───────────────────────────── 22 polls · 17 cr   │
│ [██████Sushi Ya██████|███Thai███|█Chipotle█]             │
│                                                          │
│ ─── (You) ────────────────────────── 12 polls · 9 cr     │
│ [███Sweetgreen███|███Chipotle███|██Sushi Ya██|█Thai█]    │
│   ← "You" row has saffron ring highlight                 │
│                                                          │
│ …                                                        │
└──────────────────────────────────────────────────────────┘
```

### Flavor bar anatomy

- Full-width bar, 32px tall.
- Segments sized by proportional weight within that user's total.
- Segment color: deterministic hash(restaurant name) → 12-hue sub-palette (curated: saffron, sage, indigo, honey, butter, terracotta-light, olive, plum, teal, persimmon, mustard, moss). Lock the exact 12 hues during first implementation; keep a `restaurantColor(name)` util so they're stable.
- Segment label: name inline when segment width ≥ 64px; otherwise label hides and the tooltip carries it.
- Rounded ends: leftmost 10px radius, rightmost 10px radius, internal edges 0.
- Hover / focus / tap a segment: Tooltip with `Restaurant · weight N · from P polls`.
- 1px subtle separators between segments (`border-[var(--surface-base)]`) so colors don't bleed.

### Collective bar (top)

Same as a user bar but aggregates all users. Title "The office". Slight extra border emphasis (`ring-1 ring-[var(--border-subtle)] ring-offset-2 ring-offset-[var(--surface-base)]`).

### Per-user row

- Divider above: Fraunces 500 display name + right-aligned metadata (`N polls · M credits` in mono).
- Current user marked with saffron ring around the bar + "(You)" in the display-name slot.

### View toggle (Spectrum / Details)

- Segmented control, right-aligned, below the filter row.
- Details view: original list style — `Restaurant · plain progress bar · weight`. For people who want exact numbers.

### Empty state

- Illustration: `empty-plate.svg`, saffron.
- Title: "Nothing brewing in this range."
- Body: "No votes recorded between Mar 22 and Apr 21. Widen the range to see more."

### Responsive

- Mobile: bars fill container width. Segment labels hidden; tap-to-tooltip. Metadata moves to a line below the name, not right-aligned.
- Laptop: as drawn.
- Large desktop: bars grow to `max-w-[1600px]`; no other layout change.

---

## `/settings`

Max-width 720px (editorial single-column). Brief §5.6.

### Layout

```
┌────────────────────────────────────────────┐
│ Settings                                   │
│                                            │
│ ┌─ Account ──────────────────────────────┐ │
│ │ [Avatar 40px]                          │ │
│ │ Alice Chen                             │ │  ← display name + email
│ │ alice@revia.com                        │ │
│ │ admin                                  │ │  ← chip, if admin
│ │                                        │ │
│ │ [  Sign out  ]                         │ │  ← ghost button, right-aligned
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌─ Display name ─────────────────────────┐ │
│ │ How your name appears on polls.        │ │  ← helper
│ │                                        │ │
│ │ [ Alice Chen          ]  [  Save  ]    │ │  ← TextInput + primary sm
│ │ Leave blank to use your email.         │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌─ Appearance ───── (mobile only) ───────┐ │
│ │ Theme                                  │ │
│ │ [ Light · Dark · System ]              │ │  ← lg ThemeToggle
│ │ Follows your system unless you pick    │ │
│ │ manually.                              │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌─ API keys ─────────────────────────────┐ │
│ │ Use keys to call the API as yourself.  │ │
│ │                                        │ │
│ │ Create a new key                       │ │
│ │ [ Key name          ]  [  Create  ]    │ │
│ │                                        │ │
│ │ Your keys (2)                          │ │
│ │ ┌────────────────────────────────────┐ │ │
│ │ │ CLI dev                            │ │ │  ← 2-col row
│ │ │ Created Apr 10 · Last used Apr 20  │ │ │
│ │ │                    [ Revoke ]      │ │ │  ← destructive-link button
│ │ └────────────────────────────────────┘ │ │
│ │ ┌────────────────────────────────────┐ │ │
│ │ │ Old laptop    [REVOKED]            │ │ │  ← revoked style
│ │ │ Created Feb 1 · Revoked Mar 3      │ │ │
│ │ └────────────────────────────────────┘ │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

### Sections

- Each section = `Card` with its own title (Fraunces 500, 1rem) and optional helper (text-secondary, 0.8125rem).
- Section gap 24px.

### Display name

- Form: TextInput + Button `primary sm`. Submit via server action.
- Success feedback: input border pulses sage (400ms), "Saved" Chip appears inline for 2 seconds next to Save.
- Error: FormField error slot.

### Appearance (mobile only)

- Hidden on `≥md` — desktop has ThemeToggle in AvatarMenu (direction.md §6).
- Shown on `<md` as a dedicated section because AvatarMenu is cramped on phones.

### API keys

#### Create flow — the plaintext token reveal (brief §11 #5)

After successful create, a callout replaces the form below a 180ms transition:

```
┌────────────────────────────────────────────┐
│ 🔑  Copy this token now                    │  ← Fraunces 500, saffron icon
│                                            │
│ You won't see it again. Treat it like a    │
│ password.                                  │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ sk_live_AbC123…xyZ  [ 📋 Copy ]        │ │  ← mono, saffron-tinted surface
│ └────────────────────────────────────────┘ │
│                                            │
│ [  Done  ]                                 │  ← secondary; dismisses + reveals new key in list
└────────────────────────────────────────────┘
```

- `bg-saffron-500/12 border border-saffron-500/40 rounded-lg`.
- Copy button: shows `Copied ✓` for 2 seconds after click.
- Dismissing returns the form; the new key appears in the list with a brief saffron pulse.
- ARIA: announce "New API key created. Copy the token now — it won't be shown again."

#### Key list

- Each key is a 12px-padded sub-card on `surface-sunken`.
- Active keys: name (weight 500) + `Created DATE · Last used DATE` (or `Never used`) + right-aligned `Revoke` ghost-destructive button.
- Revoked keys: greyed (opacity 60%, no hover), `REVOKED` Chip, `Created DATE · Revoked DATE`, no revoke button.

#### Revoke modal copy

Title: **Revoke this key?**
Target chip: `<key name>`
Body: "Any calls using this key will start failing immediately. You can't restore a revoked key — you'll have to create a new one."
Warning: "This can't be undone."
Destructive button label: **Revoke key**

### Empty state for keys

- Below the create form, if zero keys: "No API keys yet. Create one above if you need to automate anything." No illustration (section is too small).

---

## `/docs`

Brief §5.12, brief §11 #6. Designer-considered the most-readable screen in the app.

### Layout (laptop)

```
┌──────────────────────────────────────────────────────────┐
│  ┌─ TOC (sticky, 240px) ─┐  ┌─ Prose (max 720px) ──────┐ │
│  │ Overview               │  │                         │ │
│  │ How the app works      │  │  revia · meal           │ │
│  │ Banked credits ⬤       │  │  in-app manual          │ │  ← Fraunces 600, 2rem
│  │ How to vote            │  │                         │ │
│  │ Results                │  │  Updated April 21, 2026.│ │
│  │ History                │  │                         │ │
│  │ People page            │  │  ## How the app works   │ │  ← Fraunces 500
│  │ API keys               │  │  …prose…                │ │
│  │ Admin only             │  │                         │ │
│  │ Glossary               │  │  [illustration]         │ │
│  │ FAQ                    │  │                         │ │
│  └────────────────────────┘  └─────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### TOC

- Sticky within the layout (`position: sticky; top: 96px`).
- Links scroll-smoothly to in-page anchors.
- Active section highlighted with saffron dot + weight 500; tracked via `IntersectionObserver`.
- Mobile: collapses into a "Jump to" Select at the top of the content.

### Prose

- Max-width 720px inside a `prose` class (Tailwind typography plugin, OR hand-styled — lean hand-styled for full control).
- Headings:
  - h1: Fraunces 600, 2rem, 32px bottom margin.
  - h2: Fraunces 500, 1.5rem, saffron underline 2px offset 8px under text.
  - h3: Geist Sans 600, 1.125rem.
- Body: Geist Sans 400, 1rem, line-height 1.7.
- Code / math blocks: `font-mono`, `bg-[var(--surface-sunken)] rounded-md px-3 py-2` (inline = `px-1.5 py-0.5`).
- Blockquote-style callouts: left saffron bar 3px, `bg-saffron-500/8`, 16px padding.
- Tables (glossary): `border border-[var(--border-subtle)] rounded-md overflow-hidden`, header row `bg-[var(--surface-sunken)]`.
- Anchor links on every heading: `#` glyph fades in on hover beside the heading.

### Illustrations

One per major section:
- Rolling credits → "coins-stacking.svg"
- Voting → "checklist.svg"
- Results → "trophy.svg"
- History → "archive.svg"
- People → "people-spectrum.svg"
- API keys → "key.svg"
- Admin → "gear.svg"

All recolored to saffron or sage; 160×160 at desktop, 120×120 at mobile.

### Anchors

Every section renders with `id="<slug>"` so tooltips and InfoIcons across the app can link deep (brief §5.12 requires this). `#banked-credits` is the highest-traffic anchor.

### Footer

- Attribution line: "Illustrations from Storyset by Freepik" with a utility link.
- Last-updated date.

### Motion

- Prose fades in as sections enter viewport (IntersectionObserver → 200ms opacity + 4px translate).
- TOC active link slides its saffron dot with `view-transition` or framer-motion layout animation.

---

## Admin shell (applies to `/admin/*`)

- **Desktop (`≥md`)**: the `AdminSubNav` horizontal strip from [components.md](components.md) sits under the main TopNav — tabs Users / Restaurants / Templates / Polls with saffron active-underline.
- **Mobile (`<md`)**: the strip collapses to a single dropdown trigger at the top of the content area. Trigger looks like a Select (`bg-[var(--surface-raised)]` row, chevron right) and reads the active route name, e.g. `"Admin · Templates ▾"`. Tap opens a Radix DropdownMenu panel with the four routes as items. No persistent tab bar — the bottom nav on mobile stays as the main-app tabs (Today/History/People/Docs), not admin.
- A back-arrow breadcrumb ("← Admin") appears above the PageHeader on every `/admin/*` *leaf* page to return to the index.

## `/admin` — index

Plan is the light stats dashboard (see open question #2).

### Layout

```
┌───────────────────────────────────────────────┐
│ Admin                                         │
│ Curate the allowlist, catalog, and schedule.  │
│                                               │
│ ┌─ Stats (4-col on laptop, stack on mobile) ┐ │
│ │  14       4        12       3             │ │  ← mono, 2rem
│ │  people   templates restaurants  cancels  │ │     text-secondary 0.8125rem
│ │                                  last 30d │ │
│ └───────────────────────────────────────────┘ │
│                                               │
│ ┌─ Quick links ──────────────────────────────┐│
│ │ [Users]  [Restaurants]  [Templates]  [Polls]│  ← Card-style buttons, icon + label
│ └────────────────────────────────────────────┘│
│                                               │
│ ┌─ Recent activity ──────────────────────────┐│
│ │ · Lunch poll cancelled 2h ago by Alice     ││  ← last 5 events, text-secondary
│ │ · 3 users added to allowlist yesterday     ││
│ │ · Sweetgreen added to catalog Apr 15       ││
│ └────────────────────────────────────────────┘│
└───────────────────────────────────────────────┘
```

- Stat cards: large mono number, label below.
- Quick links: 2x2 on mobile; 4-col on laptop. Each is a big Card with icon + heading + one-line "what you can do here".
- Recent activity: optional — if sourcing is expensive, hide the section behind a flag and ship the stats + quick links only.

---

## `/admin/users`

List + add form. Brief §5.8.

### Layout

```
┌─ Add a user ───────────────────────────────────────────┐
│ Email:    [                    ]                        │
│ Display:  [                    ] (optional)             │
│ Role:     [ user ▾ ]                                    │
│ [  Add to allowlist  ]                                  │
└─────────────────────────────────────────────────────────┘

 Allowlist · 14 people

 ┌─ alice@revia.com (you) ──────────────────────────────┐
 │ Display: [ Alice Chen      ]  Role: [admin]   ☑ Active│
 │ Added Feb 3, 2026                                     │
 │ [  Save  ]                                            │
 └───────────────────────────────────────────────────────┘
 ┌─ bob@revia.com ───────────────────────────────────────┐
 │ Display: [ Bob            ]   Role: [ user ▾ ] ☑ Active│
 │ Added Mar 1, 2026                                     │
 │ [  Save  ]                       [  Delete  ]         │
 └───────────────────────────────────────────────────────┘
```

- Self row: Role select disabled, Active checkbox disabled, Delete button absent. Copy note below list: "You can't demote or deactivate yourself — make another admin first, or edit the DB directly."
- Delete modal (DestructiveConfirmModal):
  - Title: **Delete this user?**
  - Target: `{email}`
  - Body: "Their votes, participation records, and API keys will be permanently removed. History rows referencing them will show their email instead of a display name."
  - Warning: "This can't be undone."
  - Destructive label: **Delete user**

### Responsive

- Mobile: user rows stack fields vertically; Save / Delete buttons full-width.

---

## `/admin/restaurants`

Shared catalog. Brief §5.9.

### Layout

```
┌─ Add a restaurant ─────────────────────────────────────┐
│ Name:      [                    ]                       │
│ DoorDash:  [https://...         ] (optional)            │
│ Notes:     [                    ] (optional)            │
│ ☑ Active                                                │
│ [  Add  ]                                               │
└─────────────────────────────────────────────────────────┘

 Catalog · 12 restaurants

 ┌─ Chipotle ────────────────────────────────────────────┐
 │ DoorDash: https://…     ☑ Active                      │
 │ Notes: Bowls & burritos.                              │
 │ [  Save  ]                                            │
 └───────────────────────────────────────────────────────┘
 ┌─ Old Deli     [INACTIVE]──────────────────────────────┐
 │ Retained for historical poll references.              │
 │ ☐ Active                                              │
 │ [  Save  ]                                            │
 └───────────────────────────────────────────────────────┘
```

- No hard delete — inactive toggle only.
- Inactive row visually greyed (opacity 70%).

---

## `/admin/templates`

Brief §5.10.

### List layout

Cards per template with name, schedule summary (e.g. "Mon–Fri · 10:00–11:30 AM PT"), active toggle, number of assigned restaurants, click-through to edit.

### Edit layout

```
┌─ Edit template ───────────────────────────────────────┐
│ Name:        [ Lunch             ]                     │
│ Description: [ The daily group decision. ]             │
│                                                        │
│ Schedule                                               │
│ Days:   [☑Mon][☑Tue][☑Wed][☑Thu][☑Fri][ Sat][ Sun]    │  ← 7 toggle chips
│ Opens:  [ 10:00 ▾ ]                                   │
│ Closes: [ 11:30 ▾ ]                                   │
│ Zone:   [ America/Los_Angeles ▾ ]                     │
│                                                        │
│ ☑ Active                                               │
│                                                        │
│ Assigned restaurants                                   │
│ ☑ Chipotle     ☑ Sweetgreen     ☐ Thai Town           │  ← checkbox grid
│ ☑ Sushi Ya     ☐ Burger Hut     …                     │
│                                                        │
│ [  Save template  ]       [  Cancel  ]                 │
└────────────────────────────────────────────────────────┘
```

- Day toggles: Checkbox-styled pills (rounded-pill, 32px). Each shows "Mon" / "Tue" etc. Selected = saffron fill.
- Opens/Closes: Select populated with 15-minute increments; 24-hour storage, 12-hour display.
- Zone: Select seeded with common US zones + "Other…" that opens a typeahead.
- Restaurant grid: 2 cols mobile, 3 cols laptop. Each item shows name + inactive chip if the catalog entry is inactive.

---

## `/admin/polls`

List of all poll instances. Brief §5.11.

### Layout

Same filter bar as `/history` plus an extra `Upcoming` / `Open` / `Closed` / `Cancelled` status option. Rows look like history rows but include:
- A Cancel button (ghost-destructive, right) on non-cancelled rows.
- Status + winner (for closed).
- Always clickable to `/polls/{id}`.

### Cancel modal copy (DestructiveConfirmModal)

- Title: **Cancel this poll?**
- Target: `{template name} · {date}`
- Body: 2–3 sentences based on state.
  - Open: "Voting will stop immediately. Any votes already cast become banked credits again for next time."
  - Closed: "The winner will be voided and all credits that were consumed will return to their voters' banks. Use this only if the result is genuinely wrong."
- Warning: "This can't be undone."
- Destructive label: **Cancel poll**

---

## Cross-cutting implementation notes

### Forms

- Prefer server actions (Next 16 App Router). Client components only for form state + optimistic UI (e.g. vote submit animation).
- Every form has:
  - Labelled inputs via `FormField`.
  - `aria-busy="true"` on submit, button label swap to loading state.
  - Inline errors, no toast.
  - Success feedback = subtle border pulse OR Chip "Saved" next to the button.

### Loading states

- No skeleton shimmers for MVP beyond what's natural during server render. Let Next's server components handle initial paint.
- Where client fetches happen (e.g. a `ThemeSync` re-check), render the server-derived state until client mounts.
- Long operations (finalize poll, sign-out) → disable the triggering control + inline spinner.

### Errors

- Form errors inline (red) via `FormField`.
- Page-level failures (404, 500): full-page empty-state-style layout with illustration + helpful copy + link home.
- Unauthorized redirects to `/login?error=…`.

### Motion & reduced motion

- Every motion spec must also say what reduced motion does. If it's not specified, the default is cross-fade only.
- Never animate layout-blocking properties (width/height/top/left).

### Copy

- Avoid exclamation points except at genuinely celebratory moments (winner reveal title is OK: "Sweetgreen wins!").
- Avoid second-person imperatives ("Please…") — use direct present ("Pick at least one restaurant to submit.").

---

## Implementation order (a suggested wave plan for engineering)

Mirrors wireframe-plan's waves, adapted for direct build:

### Wave 1 — Foundation + primary flow

1. Token setup: replace `globals.css`, wire Fraunces, install Lucide.
2. Primitives: Button, TextInput, FormField, Checkbox, Chip, StatusBadge, BankedCreditChip, Tooltip, InfoIcon, Card, Modal, DestructiveConfirmModal, EmptyState.
3. Shell: AppShell, TopNav, BottomTabs, AvatarMenu, ThemeToggle, PageHeader, pre-hydration theme script.
4. Pages: `/login`, `/`, `/polls/[id]` all five states.
5. Exit criteria: a user can sign in, see today's polls, vote, and see the closed result with motion.

### Wave 2 — Secondary routes

6. Select, DateField, DateRangeField primitives.
7. `/history`, `/people` (spectrum + details), `/settings`, `/docs`.
8. Exit criteria: every non-admin surface lands.

### Wave 3 — Admin

9. `/admin` index, `/admin/users`, `/admin/restaurants`, `/admin/templates`, `/admin/polls`.
10. Exit criteria: every route redesigned.

Each wave is commit-sized and reviewable independently. Inside a wave, primitives land before the screens that consume them.

---

*This doc, along with [tokens.md](tokens.md) and [components.md](components.md), should be sufficient to take implementation from "stock Next.js template" to "Fresh Market shipped" without a Figma phase. If you hit a decision not covered here, flag it — a gap in these docs is a bug.*
