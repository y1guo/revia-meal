# Design direction

Companion to [../design-brief.md](../design-brief.md). The brief says *what* to build; this doc proposes *how it should look, feel, and move* — answering every open decision in §12 of the brief. Read the brief first.

This is a **proposal for alignment**, not a finished system. Nothing here is locked until the product owner signs off; §12 items in the brief were explicitly handed to the designer, so each gets a pick + rationale + the alternatives I considered.

---

## 1. Aesthetic direction — three mood boards, one recommendation

Before picking palette, type, or layout, we need to agree on the *genre* of the app. The brief's phrase "fancy, bold, beautiful, warm, slightly playful" leaves room for very different landings. I worked up three directions.

### A. "Fresh Market" — warm editorial *(recommended)*

Think: an elegant neighborhood bistro's website. Cream base, food-derived accent hues, a confident serif display pair-up with a humanist sans, generous whitespace, soft shadows. Reads as premium without being precious. Feels distinctly *about food* without resorting to cartoonish icons. Scales gracefully from mobile to the 32" office monitor because warm neutrals don't scream in either direction.

Why this wins for revia-meal:
- Food + coworkers is an inherently warm subject. A warm palette reinforces it.
- Editorial rigor gives the `/docs` page a reason to exist — a place where typography earns its keep.
- The celebratory winner moment gets a natural visual language (warm glow, paper-confetti) that doesn't feel grafted on.
- Ages well. This team will see the app every weekday for years.

### B. "Midnight Deli" — premium / moody

Deep espresso/navy base, single warm accent (terracotta or amber), higher contrast, mid-weight grotesque typography. Reads as a Michelin reservation app at night. Elegant but can feel cold in light mode, and risks reading as "enterprise dashboard" on the office monitor.

### C. "Bento Lunch" — playful maximalist

Rounded-heavy, multi-accent bento grid (each card / section gets its own accent color), heavier illustration use. Feels like Apple's iPadOS widgets or Notion Calendar. Fun, but risks decision fatigue for a daily-use internal tool — the dashboard is a screen you see every single weekday and maximal patterns tire faster than restrained ones.

**My pick: A (Fresh Market).** The rest of this doc assumes A. If the product owner leans B or C we can re-run palette + type; the structural decisions (nav, modal, spectrum, motion) port across.

---

## 2. Color palette (Fresh Market)

Light mode base:

| Token | Hex | Use |
|---|---|---|
| `cream-50` | `#FBF7F1` | Page background |
| `cream-100` | `#F3ECDF` | Card / low-elevation surfaces |
| `cream-200` | `#E6DCC8` | Borders, dividers, input backgrounds |
| `espresso-900` | `#1E1A15` | Primary text |
| `espresso-600` | `#6B6054` | Secondary text, icons |
| `espresso-400` | `#A59B8C` | Tertiary text, placeholder |

Accents (stable across light/dark, shifted for contrast):

| Token | Hex (light) | Hex (dark) | Use |
|---|---|---|---|
| `saffron-500` | `#E8A53C` | `#F4B955` | Primary brand, banked-credit annotation, focus ring |
| `saffron-700` | `#D98C19` | `#E8A53C` | Hover / pressed state of primary |
| `sage-500` | `#6B8E4E` | `#8FB26B` | **Open** status, success |
| `indigo-500` | `#4F6BB1` | `#7A93D1` | **Closed** status, info |
| `honey-500` | `#D9A43C` | `#E8B85C` | **Pending close** status |
| `butter-400` | `#D9CDA8` | `#8A7E5F` | **Scheduled** status (warm neutral) |
| `tomato-500` | `#C54A3E` | `#E06A5E` | **Cancelled** status, destructive actions |

Dark mode base: `espresso-950` (`#14110D`) page, `espresso-900` (`#1E1A15`) cards, `cream-50` primary text, `cream-300` (`#C8BCA9`) secondary.

**Why these five status hues:** they remain distinguishable in both modes and to most color-vision deficiencies (I'll verify each combination hits WCAG AA for text and a non-color cue — badge shape, icon — will back up every status so the app never relies on hue alone).

**Saffron is the brand.** It's the color of the banked-credit pill today; promoting it to brand color means the "core mechanic" is always visually tied to the product.

---

## 3. Typography

Two faces + one mono:

- **Display — Fraunces** (variable serif, Google Fonts). Used for: page titles, winner reveal, `/docs` section headings, the app wordmark. Variable axes let one font file express a lot of range (book-serious to soft-playful) without shipping multiple weights.
- **Text — Geist Sans** (system-nearby, Vercel-distributed). Used for: body copy, labels, buttons, nav, form inputs. Already optimized for UI density and light/dark parity.
- **Mono — Geist Mono.** Used only where tabular numbers matter: the `today N + banked M = total T` breakdown line (§5.3 of the brief), API key display, the code/math blocks on `/docs`.

Scale (rem-based, modular 1.2 ratio on desktop, 1.125 on mobile):

| Role | Desktop | Mobile | Face |
|---|---|---|---|
| Display (h1) | 2.25rem | 1.75rem | Fraunces 600 |
| Section (h2) | 1.5rem | 1.25rem | Fraunces 500 |
| Subsection (h3) | 1.25rem | 1.125rem | Geist Sans 600 |
| Body | 1rem | 1rem | Geist Sans 400 |
| UI / label | 0.875rem | 0.875rem | Geist Sans 500 |
| Caption / meta | 0.75rem | 0.75rem | Geist Sans 400 |
| Tabular (tally, key) | 0.875rem | 0.875rem | Geist Mono 400 |

Fraunces subset (Latin, weights 500/600, optical size 14–72): ~45 KB woff2. Acceptable one-shot font cost.

---

## 4. Illustration kit

**Pick: Storyset "Food & Drink" collection** (Freepik; free with attribution). Available in monochrome SVG we can recolor to `saffron-500` / `sage-500` variants to match, and available as Lottie for entrance motion on the `/docs` page and login splash.

Where it appears:
- Login splash (small hero).
- Empty states (dashboard "no polls today", history "no results", people "no activity in range").
- `/docs` section headers (one illustration per major topic — rolling credits, voting, API keys, glossary).
- Winner celebration — a single small celebratory scene that animates in.

Rules:
- One kit only. Never mix Storyset with unDraw or Open Peeps.
- One accent color per illustration (saffron or sage, pick per screen). No rainbow.
- Illustrations are accompaniment, never primary content. If the copy alone communicates the state, the illustration is optional.

---

## 5. Navigation

### Desktop (≥768px)

Top bar, left-aligned brand + primary nav, right-aligned avatar menu. No sidebar.

```
[revia·meal]   Today  History  People  Docs        [Admin]  [🙂 avatar ▾]
```

- **Today / History / People / Docs** are the four primary routes.
- **Admin** only shown for admins, visually separated (a thin divider before it) so it reads as a role-gated section, not just another tab.
- **Avatar menu** opens a small panel with: display name + email, "Settings", appearance submenu (Light / Dark / System), "Sign out". This is where `Settings` goes — the brief currently has it in the top nav strip, but nesting it under the avatar matches every modern app the audience already uses (GitHub, Linear, Vercel).

### Mobile (<768px)

**Top bar (slim)** — brand wordmark left, avatar menu right.

**Bottom tab bar** — four tabs, iOS-style, always visible on authenticated pages: Today / History / People / Docs. Admin is reachable through the avatar menu; admins don't need it one-tap on mobile.

Why bottom tabs and not a hamburger: bottom tabs keep the primary routes visible (better affordance, better thumb reach) and the app only has four primary routes, which is the sweet spot for a tab bar (5+ crowds; 3- wastes the space).

### Shared

- Active route is indicated by a filled saffron underline (desktop) or saffron icon + label (mobile). Never rely on color alone — the underline / icon-fill provides a shape cue.
- The admin sub-nav (restaurants / templates / polls / users) remains a secondary strip under the main top bar when inside `/admin/*`.

---

## 6. Theme toggle placement

The toggle is a **three-way segmented control** (Light · Dark · System) nested in the avatar menu on desktop and on the Settings page on mobile. Rationale:

- It's not a daily-use control — burying it one click deep is fine.
- Avatar menu is where audience-familiar apps already put it.
- On mobile, the avatar menu is cramped by bottom-tab-bar logic; putting it in Settings (where it can have room for a proper segmented control plus a one-line helper "Follows your system unless you pick manually") is cleaner.

The initial theme must be applied **pre-hydration** (via a tiny inline script reading the `revia-theme` cookie and stamping `class="dark"` on `<html>` before React mounts) to avoid flash-of-wrong-theme.

---

## 7. Modal primitive (replaces `window.confirm`)

Single reusable component for the three destructive actions (cancel-poll, revoke-api-key, delete-user) and any future ones.

**Shape:**
- Max-width 480px desktop, full-width minus 16px margins on mobile.
- Corner radius 16px. Soft shadow `0 16px 48px rgba(30,26,21,0.12)`.
- Backdrop: `rgba(30,26,21,0.45)` + `backdrop-filter: blur(4px)`.

**Structure (top to bottom):**
1. Small icon circle — `tomato-500` for destructive, `indigo-500` for informational.
2. Title — one short sentence question form ("Cancel this poll?"). Fraunces 500, 1.25rem.
3. Target chip — compact, shows what is about to be acted on ("Lunch · Fri, Apr 18, 2026"). Keeps the action specific.
4. Body — 2–3 sentences explaining consequences. Geist Sans 400.
5. If irreversible: a `tomato-500` outlined strip ("This can't be undone.") with a warning glyph.
6. Actions row — **Cancel** (text button, left) and destructive primary (filled `tomato-500`, right). Cancel button auto-focused; the destructive button never is.

**Motion:**
- Enter: `opacity 0→1` over 180ms + `scale 0.95→1` with ease-out-quart. Backdrop fades 140ms.
- Exit: `opacity 1→0` over 120ms + `scale 1→0.97` ease-in-quart.
- Respect `prefers-reduced-motion` → pure cross-fade, no scale.

**Dismissal affordances:**
- Backdrop click.
- Esc key.
- Cancel button.
- Focus is trapped inside the modal; Tab/Shift-Tab cycle between Cancel and the destructive action.

**Base tech:** Radix Dialog primitive + Tailwind styling. Hand-rolled is viable but Radix gives us focus-trapping / a11y for free.

---

## 8. `/people` — the flavor spectrum

Current implementation: vertical stack of "Restaurant name · [neutral bar] · weight" rows per user. Functional but flat.

**Proposed: a single stacked horizontal "flavor bar" per user**, segmented by restaurant, each segment colored by a deterministic hash-to-palette for that restaurant name. Width of each segment = that user's accumulated weight for that restaurant / their total weight. Hover / tap a segment → tooltip with restaurant name + weight + count of polls it came from.

Above the per-user bars, a **collective "office flavor bar"** that stacks the same way but aggregates all users in range. This reads at a glance as "here's the office mood, here's how each person differs from it."

Segment color strategy: restaurants get colors from a curated 12-hue sub-palette of the accent set plus analogous tints (all food-adjacent). Hash-based assignment stays stable across sessions.

Secondary view toggle: **Spectrum / Details**. Spectrum is the default, scannable one; Details falls back to the current list style for people who want exact numbers. Both share the same filter state.

Alternatives considered and rejected:
- Radar/spider charts — break down past ~8 restaurants.
- Chord diagrams — gorgeous, genuinely unreadable.
- Heatmap grid (users × restaurants) — compact but feels like a spreadsheet.

The flavor bar stays close to what's there, keeps information density, and finally earns the "spectrum" name.

---

## 9. Winner reveal — the celebratory moment

The Open → Closed transition is, per the brief, "emotionally the best moment in the app." Design treatment:

On first visit after a poll closes (detected client-side: previous state in storage was "open" OR we arrive via direct navigation and the `closed_at` is within the last ~2 minutes):

1. **Frame.** Breakdown rows are pre-laid-out but hidden at opacity 0, translated 12px down.
2. **Stagger in.** Rows fade + rise into place, 40ms stagger, ease-out-quart, total ~320ms.
3. **Winner emphasis.** The winning row scales from 1.00 → 1.02 → 1.00 (a soft "pop") over 280ms, simultaneously its background warms to a 10% `saffron-500` tint with a subtle glow.
4. **Paper petals.** 6–10 soft-edged paper shapes in `saffron-500` / `sage-500` / `tomato-500` at low opacity drift across the card once, settling just off the bottom edge. Non-interactive, pointer-events none. ~700ms total, single play.
5. **Banked-credit contributors.** For each voter on the winner whose pick included banked credits, their credit chip (e.g. "+0.5") animates from `0 → 0.5` over 400ms with a soft glint.

Repeat visits skip celebration and render the stable state immediately. `prefers-reduced-motion` collapses the whole thing to a cross-fade of the rows.

The celebration must **never** block a user action — nav, back button, copy, voter-list hover all work while the motion plays.

---

## 10. Banked-credit visualization (on the voting form)

This is the mechanic, and the brief calls out that it should "feel natural and visible, not tucked away." Current treatment: amber pill "+0.5 banked".

**Proposed refinement** (keep it a chip, dial up the semantics):

```
[🪙 +0.5 banked]   Chipotle
```

- A small coin-stack glyph (custom SVG, part of the icon set) sits inside a `saffron-500/10` tinted chip with `saffron-700` text.
- On hover/focus, a tooltip reveals: "You have half a vote banked for Chipotle from a previous poll. If Chipotle wins and you pick it today, this exercises." + a "Learn more →" link to `/docs#banked-credits`.
- Chips are only rendered when weight > 0. Zero-state shows nothing (not "0 banked").
- On mobile, a long-press triggers the tooltip.

The ⓘ-next-to-term pattern (brief §6.8) is satisfied by the chip itself being the affordance.

---

## 11. Layout system

### Spacing tokens
4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 (px). Named `space-1` through `space-9` in a Tailwind token extension.

### Radii
- 6 — inputs, small buttons
- 10 — cards, pills (tall)
- 14 — modal, dialog
- 999 — fully-rounded chips (status, banked credit)

### Elevation
- `shadow-sm` — cards at rest: `0 1px 2px rgba(30,26,21,0.06)`
- `shadow-md` — card hover / dropdown: `0 8px 24px rgba(30,26,21,0.08)`
- `shadow-lg` — modal: `0 16px 48px rgba(30,26,21,0.12)`
- In dark mode, shadows are replaced by a 1px `cream-50/10` inner border (shadows read as dirt against dark cream cards).

### Container strategy (responsive targets — brief §7)

| Page | 32" 4K (>=1920 eff.) | 16" MBP (1440–1920) | Mobile (<640) |
|---|---|---|---|
| Dashboard | Max-width 1200px, centered | Max-width 1200px | Single column, cards stack |
| Poll page | Max-width 880px (reading) | Max-width 880px | Full bleed |
| History | Up to 1400px, 2-column on widest | Single column | Single column |
| People | Bars fill to 1600px | Bars fill to container | Bars stack, segments legible on narrow |
| Docs | 2-column: sticky TOC + 720px prose | Same | TOC collapses to top accordion |
| Settings, Admin | Max-width 720px | Max-width 720px | Full bleed |

Principle: *editorial reading* pages stay narrow (Docs, Poll page, Settings). *Dashboarding* pages (History, People) scale up to use the 4K canvas. Dashboard sits in the middle — wide enough to breathe, narrow enough to feel warm.

---

## 12. Motion vocabulary

- Durations: 120ms (dismiss), 180ms (primary transition), 240ms (entrance), 700ms ceiling (winner reveal only).
- Easings: `ease-out-quart` for entrances, `ease-in-quart` for exits, `spring(300,30)` for optimistic form feedback (e.g. vote submit).
- Hover lift: cards nudge -2px translateY + shadow-sm → shadow-md, 140ms.
- Page transitions: only on route change, a 120ms cross-fade at the main content region; the app shell (top bar, bottom tabs) stays put.
- **`prefers-reduced-motion`** collapses all entrance and pop motion to cross-fades; preserves focus ring transitions and hover lifts only.

Never animate layout-blocking properties (width, height, top, left) — stick to `transform` and `opacity`.

---

## 13. Logo / wordmark (proposal)

There's no logo yet; here's a placeholder direction we can iterate:

**Wordmark.** `revia·meal` set in Fraunces 600 with the `·` (interpunct) replaced by a small saffron-filled circle — reads as a plate. Full wordmark sits in the top bar. At favicon / app-icon scale, reduce to the saffron plate circle over a cream square.

Alternatives to try: a two-letter monogram (`rm`) stamped in a rounded square; a stylized fork-leaf glyph. I'd hold these for a second pass after the main direction lands — the wordmark is more than enough for MVP.

---

## 14. In-UI guidance patterns (design brief §6.8)

Formalizing how the progressive-disclosure patterns render:

- **Helper text** — `text-espresso-600` (`cream-300` dark), 0.875rem, sits directly under inputs and section headings.
- **Tooltips** — small dark chip (`espresso-900` in light, `cream-100` in dark — inverted), 0.75rem, with a 1px accent border on focus-triggered reveals. Always dismissable via Esc. Always keyboard-accessible — triggered by focus, not only hover. On mobile, tap to open; tap outside to dismiss. 240ms fade-in.
- **Info icons (ⓘ)** — sit inline next to the labeled term, 0.875rem, `espresso-600` color, subtle hover underline. Clicking/tapping/focusing opens the tooltip, which always ends with "Learn more →" linking to the relevant `/docs` anchor.
- **Warm empty states** — Storyset illustration + one-sentence "what this page is for" + one-line "why it's empty right now" + (if applicable) a primary action button. Never just "No results."
- **First-visit hints** — allowed only as a dismissable inline banner (not a modal, not a tour). Dismissable with a single click, stores dismissal in `localStorage`, never returns unless explicitly reset.

Anti-patterns (brief §6.8) are non-negotiable: no multi-step tours, no coach marks, no blocking modals on first load, ever.

---

## 15. What's intentionally left for later

Calling out so nothing falls through the cracks in review:

- **Final logo + app icon.** The wordmark proposal is placeholder.
- **Exact illustration selection per screen.** One Storyset piece per empty state / docs section, confirmed during implementation. Filenames referenced in [pages.md](pages.md) are *placeholders* — they need to be matched against actual Storyset assets before commit.
- **Final restaurant color assignments** in the flavor bar — needs a curated 12-hue sub-palette; lock this when building the `/people` page.
- **Accessibility audit pass.** Contrast ratios and focus-ring visibility verified per-component during build; full report when Wave 1 lands.
- **Copy tone pass.** Brief §6.7 says slightly dry with room for playfulness. Copy for empty states and confirmation modals is drafted inline in [pages.md](pages.md); a distinct tone review after the first wave ships.

---

*Next step: alignment on this document, then the [wireframe plan](wireframe-plan.md) drives what gets built in Figma and in what order.*
