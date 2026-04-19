# Wireframe plan

> **Superseded.** This doc describes a Figma production flow we're no longer running (API quota was exhausted and the paid tier isn't warranted for a personal project). Implementation proceeds straight to code, guided by:
>
> - [tokens.md](tokens.md) — Tailwind 4 `@theme`, fonts, theme plumbing, icon library
> - [components.md](components.md) — reusable component catalog
> - [pages.md](pages.md) — per-page layouts, states, and copy
>
> Kept for reference because the **three-wave production order** and the **priority-screens list** below still apply 1:1 to engineering. See [pages.md §"Implementation order"](pages.md) for the engineering-adapted version.

Driven by [direction.md](direction.md). Assumes the "Fresh Market" aesthetic lands; structural decisions port across if we pivot.

The goal of this plan is to convert the page inventory in [../design-brief.md §5](../design-brief.md) into a concrete, staged production order in Figma — what to draw first, what fidelity to draw it at, and what signals reviewer approval.

---

## Working fidelity

Three fidelity levels; each page passes through at least levels 1 and 2.

- **L1 — Greybox.** Structural layout, no color beyond the status token hues, system fonts. Purpose: agree on layout, hierarchy, responsive breakpoints, content density.
- **L2 — Branded.** Real palette, real typography, real illustrations, final spacing. Purpose: agree on visual treatment and micro-interactions.
- **L3 — Prototype.** Interactive flows in Figma (voting, winner reveal, theme toggle). Purpose: validate motion specs before engineering.

Every screen goes through L1 → approval → L2 → approval. L3 is reserved for the five "especially design-worthy" screens called out in brief §11.

---

## Figma file structure

Single Figma file, organized by page-tab:

1. **Foundations** — colors, type, spacing, radii, elevation, motion curves, icon grid. Published as the shared library for the rest of the file.
2. **Components** — buttons, inputs, selects, date-range picker, status badge, banked-credit chip, nav (desktop + mobile), avatar menu, modal, toast (if needed), empty-state template, tooltip.
3. **Screens — MVP routes** — every page from brief §5, at L1 then L2. Each screen has frames for desktop + mobile at minimum; large-desktop (4K) only where the layout meaningfully changes (Dashboard, History, People).
4. **Flows** — L3 prototypes for the five priority screens.
5. **Exports** — final illustration assets + logo wordmark, sized and exported.

Naming convention: `[route] / [state] / [breakpoint]` — e.g. `/polls/[id] / closed / desktop`, `/people / empty / mobile`.

---

## Production order

I'll build in three waves. Each wave is a natural review point.

### Wave 1 — Foundations & primary flow

Lock the design system and the single path a first-time user cares about: land → see today's poll → vote → see the result.

1. Foundations tab — tokens, type scale, icon grid, status badge set, banked-credit chip, illustration placements.
2. Components tab — top nav (desktop), bottom tab bar (mobile), avatar menu + appearance submenu, button set, form controls (text input, textarea, checkbox, date picker, select), empty-state template, modal primitive, tooltip, ⓘ icon pattern.
3. Screens — priority 1 (L1 + L2):
   - `/` dashboard (three states: today-has-polls / no-polls-today / mixed-statuses).
   - `/polls/[id]` — all five status states: scheduled, open, closed, cancelled, pending-close. The **open** state has two sub-variants: normal voting and the "you've already voted in another template today" conflict state (brief §5.3).
   - `/login`.

**Wave-1 exit criteria:** product owner approves the aesthetic direction + the voting-and-result flow reads intuitively without needing /docs. The winner reveal (L3 prototype) is working in Figma.

### Wave 2 — Secondary routes & settings

Everything non-admin a regular user touches beyond voting.

4. `/history` — with filters populated + empty state.
5. `/people` — spectrum view (default) + details view + empty state. Flavor bar locked.
6. `/settings` — display name section + create-key flow (including the one-time plaintext token reveal callout) + keys list + revoke modal.
7. `/docs` — full structure: sticky TOC sidebar (desktop) + collapsible TOC (mobile), all major sections from brief §5.12 laid out with placeholder copy, anchor link pattern demonstrated.

**Wave-2 exit criteria:** a user can do any non-admin task comfortably, and the `/docs` page is good enough to ship as the canonical explainer.

### Wave 3 — Admin surfaces

Lower design priority per brief §11 ("Everything else can be well-crafted but functional") but still needs visual alignment.

8. `/admin` index (considered: replace with a light stats dashboard — flagging that as an open question, see below).
9. `/admin/users` — list + add form + delete confirm modal.
10. `/admin/restaurants` — list + add/edit panel + active toggle.
11. `/admin/templates` — list + edit view (schedule grid, restaurant picker).
12. `/admin/polls` — list + cancel confirm modal (cross-linking to the generic modal primitive).

**Wave-3 exit criteria:** admin pages visually coherent with the rest of the app; cancel-poll modal copy final.

---

## Interactive prototypes (L3)

Only five screens / flows warrant L3 in Figma — these are the moments where motion and flow matter enough that static frames won't capture them:

1. **Vote submission** (open poll → optimistic feedback → updated banked-credit annotation).
2. **Winner reveal** (open → finalizing → closed, with petal + pop animation).
3. **Theme toggle** (avatar menu → three-way segmented control → full-app repaint, no flash).
4. **Modal dismissal patterns** (backdrop click, Esc, Cancel button; focus trap) — one prototype, reused conceptually for all three destructive actions.
5. **Create-API-key token reveal** (button click → generation → one-time plaintext callout → copied confirmation).

Each L3 prototype exports a short (≤10s) preview video for the engineering handoff.

---

## Responsive coverage per screen

The brief requires three first-class targets. Not every screen's layout changes meaningfully between 16" MBP and 32" 4K; I'll produce:

- **Mobile (~390px)** — every screen, always.
- **Laptop (1440px)** — every screen, always. This is the primary design target.
- **Large desktop (2560px)** — only for Dashboard, History, People, and Docs (where wider canvases mean different layouts). Other screens are max-width-constrained so large-desktop is visually identical to laptop.

Breakpoints I'll use in the Figma frame naming (matches Tailwind defaults unless called out): `sm 640` / `md 768` / `lg 1024` / `xl 1280` / `2xl 1536` / `4k 1920+`.

---

## What I'm NOT designing in this phase

Scope guardrails, so review stays focused:

- Email/notification templates — brief excludes this; Slack cron is external.
- Marketing / landing-page work — there's no such surface.
- A full illustration custom-draw effort — brief defers this, we use Storyset.
- Final copy pass across the entire app — I'll draft copy for modals, empty states, and ⓘ tooltips, but body copy on `/docs` comes from the engineering side sourcing from `polls.md` and `features.md`.
- Supabase-auth UI beyond `/login` — Google OAuth button and error message state only.

---

## Open questions for the product owner

Things worth confirming before I start pushing pixels:

1. **Aesthetic direction** — sign off on "Fresh Market" vs. exploring "Midnight Deli" or "Bento Lunch" further (direction.md §1). This is the single biggest lever — every subsequent decision flows from it.
2. **`/admin` index** — keep as a near-empty list of sub-page links (brief §5.7) or upgrade to a small stats dashboard (pending polls count, allowlist size, recent cancellations)? The upgrade is not hard and adds value, but is technically post-MVP.
3. **Logo effort level** — placeholder wordmark now and revisit, or invest in a real logo exploration as part of this phase?
4. **Docs route name** — brief §5.12 offers `/docs`, `/help`, `/guide`, `/manual`. I'm assuming `/docs` throughout; confirm or switch.
5. **Mobile admin pattern** — admin pages on mobile are lower priority per the brief, but they still need to work. Is a simplified mobile layout (view-only for some controls, full editing on desktop) acceptable, or must every admin control work one-handed?
6. **Illustration attribution** — Storyset requires a small attribution link somewhere. `/docs` footer is the natural home; confirm that's acceptable (alternative: a one-off paid license, not expensive).

---

## Rough timeline (indicative, not commitments)

- **Wave 1** — 2–3 working sessions to land foundations + primary flow, with one product-owner review between L1 and L2.
- **Wave 2** — 2 working sessions.
- **Wave 3** — 1 working session.
- **L3 prototypes** — interleaved with Wave 1 and 2; not a separate phase.

Engineering handoff can start as soon as Wave 1 is approved at L2 — foundations + primary flow is enough to start implementing the design system and the dashboard / poll pages in parallel with the rest of the design work.

---

*Next step: review of this plan alongside [direction.md](direction.md), then kick off Wave 1 in Figma.*
