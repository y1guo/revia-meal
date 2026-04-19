# Design brief

This document exists to hand off enough context for a designer to produce a working UI design without having to read the codebase. It describes what the app does, who uses it, every page and its states, the shared patterns, the mental models that shouldn't be lost in translation, and the technical constraints that bound what's feasible.

The doc is long by design — a designer should be able to skim the headings and dig into sections as needed.

---

## 1. What the app is

**revia-meal** is an internal lunch-poll app for HeyRevia's ~15-person US office. Every weekday the office orders lunch together. This app replaces what was previously a Slack thread of "what do you want?" with a structured poll that:

1. Opens at a scheduled time each day.
2. Lets everyone vote for their preferred restaurant(s).
3. Closes at a scheduled time and picks a winner.
4. Remembers unused preferences as "banked credits" so people who kept losing eventually get their turn.

The rolling-credit mechanism is the novel and essential part — it's the reason this exists instead of being a two-day Slackbot hack. Designs should make banked credits feel natural and visible to the user, not tucked away.

## 2. Who uses it

- **All employees** — vote in polls, see results, manage their display name + API keys.
- **An admin (or two)** — curate the allowlist, configure templates (recurring polls), maintain the restaurant catalog, and cancel polls when needed.
- The system is internal, behind Google SSO with an email allowlist. No marketing copy, no onboarding flows for external users. Assume the reader already knows what a "poll" is.

Scale: ~15 active users, ~3–5 poll templates at the outer limit (e.g. "Lunch", "Happy Hour"), typically one active template running on any given day.

## 3. Design goals

The current UI is functional monochrome — black text on white, Tailwind neutrals, utility-first, no illustration. It reads as a developer prototype. The goal is to replace it with something that actually inspires and delights the ~15-person office that uses it every day.

**Explicit requirements from the product owner:**

- **Fancy, bold, beautiful.** This is a showpiece, not a utilitarian admin tool. The product owner wants colleagues to feel "inspired and refreshing" when they open it. Restraint is allowed where restraint is beautiful, but blandness is not the goal.
- **Fully responsive.** Has to work well at three primary sizes: 32-inch 4K desktop (think: poll visible on an office monitor), 16-inch MacBook Pro (~1728×1117), and modern mobile phones (~390–430px wide). Assume people will vote from whichever device is closest.
- **Illustration is welcome** — but for MVP, please use publicly available illustration kits (unDraw, Storyset, Humaaans, Open Peeps, undraw-alternatives, etc.). Custom hand-drawn artwork is deferred to a later iteration. Pick a kit whose style fits the overall aesthetic and stick to it — mixing kits tends to look inconsistent.
- **Three theme modes: light, dark, and follow-system.** All three are first-class. An explicit light/dark/system toggle UI is new (current state is system-follow only via Tailwind's `dark:` variants); the designer should propose where it lives (header? settings? floating pill?).
- **Motion matters.** Transitions, hover states, entrance animations, micro-interactions are all welcome and expected. It should *feel* like something, not just render. Examples: page transitions, optimistic-feeling form submits, celebratory micro-moments on poll close / winner reveal, satisfying checkbox toggles during voting. Taste and restraint still apply — animations should land in well under a second and never block a user action.
- **No native system UI.** Any native-looking element (`window.confirm()`, default HTML select styling, default date picker appearance, etc.) needs to be replaced with custom components that match the brand.
- **Progressive disclosure over onboarding.** The UI must teach itself. Inspiration: Apple — so intuitive that most users never read a manual. **No blocking onboarding tours** — no multi-step tutorials that trap focus, no "click this button to continue" coach marks that disable the rest of the app, no modal takeovers that demand dismissal before use. Users must always retain full freedom of movement. Guidance is delivered through self-explanatory labels, helper text under inputs, tooltips on hover, info icons (ⓘ) next to non-obvious terms, warm empty states that explain what will appear there, and inline examples. If a first-time hint is ever added (e.g. a dismissable banner), it must be dismissable with a single action and must never block navigation. Detail in §6.8.

**Softer preferences** (designer has room to interpret):

- **Information-dense where it matters** (closed-poll breakdowns, history lists, the `/people` spectrum) and **sparse where it doesn't** (single-action pages like Settings).
- **Warmth.** This is about food with coworkers — a human, slightly playful edge is appropriate. Corporate sterility is the anti-goal.

## 4. Mental models the design must preserve

### 4.1 Rolling credits (the core mechanic)

A banked credit is **attached to a specific user AND restaurant pair** — not a pool. The rules the user must intuit:

- When you vote for a restaurant that loses, your vote becomes a banked credit for that (you, restaurant) pair.
- When a future poll happens AND that restaurant wins AND you're present AND you vote for it, your banked credits "exercise" — they move from bank to consumed.
- If the restaurant wins but you're not voting for it today (you wanted something else, or you didn't vote), your credits stay banked.

The design needs to make two things feel natural:

1. **During voting**: "You have +0.5 banked for Chipotle" shown inline next to the restaurant. Currently an amber pill; could be a badge, a glyph, whatever reads.
2. **Post-close**: the breakdown `today N + banked M = total T` per restaurant, with the per-user voter list. The designer should decide how much weight this screen deserves; it's the evidence that the fairness mechanic actually works.

Detailed spec: [`docs/polls.md`](polls.md).

### 4.2 Poll lifecycle

Every poll flows through these states (derived from timestamps, not a mutable enum):

```
scheduled → open → (pending_close) → closed
                 ↘                 ↗
                   cancelled (no votes)
                   cancelled (admin action — any state)
```

- **Scheduled**: created, voting hasn't started. Read-only ballot preview.
- **Open**: voting window is live. User can add/remove picks freely.
- **Pending close**: voting window has elapsed but finalization hasn't run yet. Transient — the first page visit finalizes it. Users rarely see this.
- **Closed**: winner chosen, breakdown available.
- **Cancelled**: either nobody voted, or an admin cancelled (can happen from any non-cancelled state, even post-close — see [`docs/polls.md`](polls.md) cancellation section).

Each state is a meaningfully different view. See §5 for the per-page breakdown.

### 4.3 One poll per user per day

A user can vote in **only one** template's poll per local date. The lock is created on their first vote. The UI must gracefully communicate this when they visit a second open poll the same day: "You've already voted in 'Happy Hour' today."

## 5. Page inventory

All URLs are relative to the app root. All pages except `/login` require an active session.

### 5.1 `/login`
- Google OAuth button.
- If sign-in succeeds but the email isn't on the allowlist or is deactivated, the user is signed out automatically and bounced back here with an error message.
- This is the only unauthenticated page.

### 5.2 `/` — dashboard / today's polls
**Purpose**: the landing view. Shows one card per active template whose schedule includes today.

**Primary content**: 0–N poll cards. Each card has:
- Template name + optional description.
- Status badge (see §6.2).
- Contextual subtitle: "Opens 10:00 AM" / "Closes 11:30 AM" / "Closed" / "Cancelled (no votes)" / "Cancelled by admin".

**Empty state**: "No polls scheduled for today. Check back tomorrow, or ask an admin to activate a template whose schedule includes today."

**Header/nav**:
- Title: revia-meal.
- Subtitle: "Signed in as {display name or email} (admin)" — role is shown when admin.
- Links: People, History, Docs (new — see §5.12), Settings, Admin (admins only), Sign out.

### 5.3 `/polls/:id` — the poll itself
This is the workhorse page. Five distinct views based on status:

#### Scheduled
- Template name, description, date.
- "This poll opens at HH:MM and closes at HH:MM."
- Read-only list of the restaurants that will appear on the ballot.

#### Open
- "Voting is **open**. Closes at HH:MM."
- **Voting form**: list of restaurants, each with a checkbox. User adds/removes picks freely.
- Per-restaurant inline:
  - Restaurant name.
  - Optional DoorDash link (opens in new tab).
  - Optional notes (short description, allergen info, whatever admin entered).
  - **Banked-credit annotation** ("+0.5 banked") when present, or nothing if zero. Today this is an amber pill; its prominence is a design question.
- Live preview: "Each pick gets 1/N credit" where N = number of picks.
- Submit button. Fully editable — submitting updates the user's row set for this poll.
- **Conflict state**: if the user has already voted in another template's poll today, the voting UI is replaced with a message: `You've already voted in "Happy Hour" today. You can only participate in one poll per day.`
- **Aggregate live tally is intentionally hidden** during open state. Users see only their own banked credits. This is a deliberate design choice to prevent herd/bandwagon voting — please preserve it.

#### Pending close (rare; transient)
- "The voting window has ended. Finalization is in progress — refresh in a moment."
- Users rarely hit this; finalize runs on any page visit that lands here.

#### Closed
- "This poll closed at HH:MM. The breakdown below shows today's votes plus each voter's banked credit contribution."
- **Winner callout**: the winning restaurant is highlighted (currently green background row).
- **Per-restaurant breakdown** (sorted: winner first, then by total tally desc):
  - Restaurant name + winner badge if applicable.
  - Optional DoorDash link + notes.
  - Tally line: `today N + banked M = total T`. Monospace / tabular numbers are important here because people compare across rows.
  - Voter list: `Alice (0.5), Bob (1), You (0.5)` — the current user is marked and slightly emphasized.
- Voters might be many names in a row on high-participation days — wrapping behavior needs care.

#### Cancelled
- "This poll was cancelled by an admin." or "This poll was cancelled because no one voted."
- Read-only ballot list.
- If the current user voted before cancellation, their restaurant picks show a "you voted" badge.
- Tallies and voter lists are NOT shown for cancelled polls in the web UI (even if snapshot exists in DB) — the poll is nullified, so showing those would mislead.

### 5.4 `/history`
**Purpose**: past polls — closed or cancelled — browsable and filterable.

**Filters** (horizontal form, submits via GET so URL is shareable):
- Template (dropdown).
- Date range (from/to; defaults to last 30 days).
- Status (All / Closed / Cancelled).
- Winner restaurant (dropdown).
- Participant (dropdown of users) — "show polls that X voted in."

**Results**: list of poll rows. Each row:
- Template name.
- Date (e.g. "Sat, Apr 18, 2026").
- Status badge.
- Vote count ("3 voters").
- For closed: "winner: Chipotle".
- For cancelled: reason — "no votes" or "cancelled by admin".
- Entire row links to `/polls/:id`.

**Empty state**: "No polls match these filters."

### 5.5 `/people` — the spectrum page
**Purpose**: a "who likes what" view. Each user's restaurant preferences aggregated over a date range.

**Filters**:
- Date range (from/to; defaults to last 30 days).

**Results**: list of user sections. Each section:
- User display name.
- Right-aligned summary: `N polls · X credits`.
- Per-restaurant rows: `Restaurant name · horizontal bar (width proportional to user's weight for that restaurant) · weight (N)`.

Bars are currently a plain neutral fill on a light track. This is a candidate for the most visual upgrade — think of it as a personal flavor spectrum.

### 5.6 `/settings`
**Purpose**: user's own preferences.

**Sections**:
- Header: "Signed in as X (admin)." with a Sign out button.
- **Display name**: single input with a Save button. Empty → falls back to email.
- **Create an API key**: name input + Create button. On success: shows the plaintext token once (amber callout — "Copy this token now, it won't be shown again"). On failure: inline red error.
- **Your keys (N)**: list. Each key: name, created date, last used (or "Never used"), revoke button. Revoked keys are shown greyed-out with a "revoked" badge and their revoked timestamp — they can't be restored.

### 5.7 `/admin` — admin index
Just a list of sub-pages with one-line blurbs. Almost placeholder — could be replaced with a richer dashboard (pending polls count, pending allowlist additions, etc.) but that's post-MVP.

### 5.8 `/admin/users`
List of everyone on the allowlist. Per row:
- Email (marked "(you)" for self).
- Added-on date.
- Editable display name.
- Role dropdown (user / admin). Disabled for self.
- Active checkbox. Disabled for self.
- Save button.
- Delete button (red outline; not present on self). Triggers a confirm dialog warning that votes, participation records, and API keys cascade-delete.
- Add-user form at the top.

Copy: "You can't demote or deactivate yourself — make another admin first, or edit the DB directly."

### 5.9 `/admin/restaurants`
Shared restaurant catalog. Add, edit, toggle active. No hard delete — inactive restaurants stay in the DB (they may still be referenced by historical polls). Restaurant = name + optional DoorDash URL + optional notes + active flag.

### 5.10 `/admin/templates`
List of templates. Click through to edit one:
- Name, description.
- Schedule: days of week (Mon–Sun checkboxes), opens at, closes at, timezone.
- Active toggle.
- Assigned restaurants — checkboxes pulling from the catalog. Only these appear on polls generated from this template.

### 5.11 `/admin/polls`
List of all poll instances (upcoming, open, closed, cancelled). Same filters as `/history` plus:
- Cancel button per row (not shown for already-cancelled polls). Confirm dialog explains consequences, including that closed polls can be cancelled and credits will come back.

### 5.12 `/docs` — user-facing documentation (new; not yet built)
**Purpose**: an in-app user manual. The polling mechanism is specialized enough that curious users should be able to dig in and verify it works the way we claim. It also soaks up concepts the UI can't fully self-explain without becoming cluttered.

**Route name is open** — `/docs`, `/help`, `/guide`, or `/manual` all work. Pick whatever reads best with the rest of the nav.

**Content scope** (content copy will be written separately; the designer only needs to lay out the reading surface):
- **How the app works** — day-in-the-life narrative: "A template schedule opens a poll every workday at 11am. You and your coworkers vote..."
- **The rolling-credit algorithm explained** — end-user-friendly version of [`docs/polls.md`](polls.md). Includes concrete worked examples: "Alice votes Chipotle, Bob votes Sushi (twice in a row). Bob wins next time. Here's why."
- **Why your pick might lose even if it got the most votes today** — the #1 FAQ. Because banked credits from past polls can swing the total.
- **How to vote** / **How results are shown** / **How history works** / **How the spectrum page works**.
- **API keys** — when to use them, what scope they have (same permissions as the owning user), security notes (treat like a password).
- **Admin-only section** — conditionally rendered or permanently visible; explains templates, restaurants, allowlist, cancellation semantics.
- **Glossary** — same as §8 of this brief, user-phrased.
- **FAQ / troubleshooting** — "I can't vote, why?" (daily lock), "Where did my banked credit go?" (exercised), "Why no poll today?" (schedule doesn't include today), etc.

**Reading-surface design considerations**:
- Probably one long scrollable page with a sticky table-of-contents sidebar. App is small enough that this fits. Multi-page is fine too if the designer prefers.
- Typography matters here more than anywhere else in the app — this is the one screen people will actually read.
- Code / math examples (e.g. the `vote_weight = 1/N` formula, or the `today + banked = total` equation) should render distinctly — a code block style, a boxed example, whatever fits the aesthetic.
- Linking *into* this doc from elsewhere in the app is expected — e.g. a tooltip on "banked credit" could have a "Learn more →" link pointing to `/docs#banked-credits`. So deep-linkable anchors are required.
- Illustrations are especially welcome here.
- First-class on mobile — people might read it on their phone over lunch.

**Auth**: behind the existing login wall (same as every page except `/login`). Lifting that to make `/docs` publicly readable is a possible future change but not MVP.

### 6.1 Navigation
Currently a flat horizontal strip of links in the page header. `/admin/*` pages use a dedicated nav with restaurants/templates/polls/users tabs.

No persistent sidebar. No breadcrumbs (except a "← Today's polls" link at the top of leaf pages). Mobile nav is undefined — the current top-link strip wraps and overflows on phones.

Proposing a mobile pattern (and deciding whether to keep the current desktop pattern) is up to the designer — see §12 item 6.

### 6.2 Status badges
Poll statuses currently use these colors:
- **scheduled**: neutral grey.
- **open**: green.
- **pending_close**: yellow (rarely seen).
- **closed**: blue.
- **cancelled**: red.

Used on dashboard cards, history rows, admin/polls rows, and in poll page headers. The five-way visual distinction matters; the specific hues don't (see §12 item 2).

Revoked API keys on `/settings` use a separate greyed-out pill with a "revoked" label — not one of the five poll-status colors.

### 6.3 Destructive actions
Three destructive actions in the app: cancel-poll, revoke-api-key, delete-user. Currently each fires a native `window.confirm()` dialog — this will be replaced with a custom modal pattern as part of the design (see §3).

Whatever modal pattern is proposed, it must accommodate:
- **What the target is** (poll name + date, key name, user email).
- **What happens** — the side effects (e.g. "credits come back", "cascades to votes / participation / keys").
- **Whether it's reversible** — usually it isn't.

Confirm copy is longer than typical because the consequences are non-obvious (cancel-poll especially). The modal should comfortably hold 2–3 sentences of explanation without feeling cramped.

### 6.4 Empty states
Every list has one. Current copy is terse and plain. A designer could add illustration/warmth here without breaking anything.

### 6.5 Error states
Form errors inline, red text. No toasts. No global banner.

### 6.6 Loading states
Currently minimal — server components render on the server, so there's no client-side loading skeleton for initial paint. Form submits disable the button and change its label (e.g. "Creating..."). No spinners.

Since motion is a design goal (§3), loading states are a design opportunity. Consider: skeleton shimmers for the dashboard / history / people pages on first load; subtle transitions between poll states; optimistic-feeling micro-interactions on vote submit and revoke / delete actions.

### 6.7 Copy tone
Currently: direct, slightly dry, occasionally technical ("banked credit", "finalized", "cancelled by admin"). Avoids corporate-speak. Ironic or playful tone is probably OK given the subject matter (lunch) — but not required.

### 6.8 In-UI guidance (progressive disclosure)

Per §3, the UI teaches itself. **No blocking onboarding, ever.** This section enumerates the patterns the design should lean on instead.

**Patterns that are in-scope:**

- **Self-explanatory labels.** Every input, button, and badge should read correctly standalone. "Save" is fine; "OK" is not. "Create key" beats "Submit". No jargon users haven't already met on the same screen.
- **Helper text.** Short description under section headings or inputs, explaining purpose — already used on Settings ("How your name appears on polls..."). Extend this pattern everywhere it's the shortest path to clarity.
- **Tooltips on hover.** For any term the glossary (§8) defines and the user might not know. Keyboard-accessible (focus-triggers, not just hover). Mobile: tap to show, tap outside to dismiss.
- **Info icons (ⓘ) next to non-obvious labels.** E.g. next to the "+0.5 banked" pill on the voting page, tapping/hovering gives a one-sentence explanation plus a "Learn more →" link into `/docs`.
- **Warm empty states.** Every empty list today says something terse like "No polls match these filters." The designer should expand these into inviting, explanatory states: what this page is for, why it's empty, what to do next, and an illustration if it fits.
- **Inline examples.** On the voting form, a tiny preview of the math: "You picked 2 restaurants — each counts as 0.5 credit." Already present; the design should preserve and potentially enrich.
- **First-visit hints** (optional, non-blocking). If the designer wants to highlight a feature on first visit (e.g. "New here? Hover any ⓘ for context"), it must be a dismissable banner or inline note. Never a modal. Never a tour. Never anything that traps focus.
- **Contextual links into `/docs`.** Tooltips and info icons should deep-link to the relevant `/docs` anchor for users who want more.

**Anti-patterns — explicitly forbidden:**

- Multi-step onboarding tours that gate app usage.
- Coach marks that require "Next" clicks to proceed.
- Modal takeovers that force engagement before letting users navigate.
- Any UI that removes the user's ability to click the nav, back button, or close icon.
- "Please complete your profile to continue" walls.

**First-run reality.** A brand-new user logs in, lands on the dashboard, sees today's polls. They should be able to click one and vote *without reading anything*. Any explanation they need along the way comes from labels, tooltips, and optional ⓘ-into-`/docs` links. The `/docs` page exists for the minority who want to go deeper — it's opt-in, never pushed.

## 7. Device / responsive targets

Three first-class targets — the design must feel right at each:

| Target | Typical viewport | Notes |
|---|---|---|
| **Large desktop / office monitor** | 32" 4K, ~2560×1440 effective | Could be left open on an office display. Don't waste the canvas, but don't force unnecessary density either. |
| **Laptop** | 16" MBP, ~1728×1117 | The most common case. Primary design target. |
| **Mobile phone** | 390–430px wide | Needs to work one-handed. Touch targets ≥44px. Vote submission and poll viewing are the priority flows here; admin screens can be lower priority on mobile but still need to work. |

Current implementation is desktop-first and uses Tailwind default breakpoints sparingly — mobile "renders but overflows." Expect to redo responsive breakpoints page-by-page.

## 8. Terminology (glossary)

Use these terms consistently. Renaming is cheap if we change everywhere together, but please discuss with the user before rebranding core concepts.

| Term | Meaning |
|---|---|
| **Template** | A recurring poll definition (schedule + ballot). "Lunch", "Happy Hour". |
| **Poll** | One instance of a template for a specific date. Templates instantiate polls. |
| **Ballot** | The list of restaurants on a specific poll. |
| **Pick** | A single user's selection of one restaurant on a ballot. |
| **Vote** | The act of submitting picks (plural picks → one submit). |
| **Vote weight** | `1 / number_of_picks`. If you pick 2 restaurants, each pick is worth 0.5. |
| **Banked credit** | A previously-cast vote that didn't "exercise" — available to boost a future poll. |
| **Exercised** | A vote that was consumed by a winning poll. No longer contributes. |
| **Finalized** | A poll that's been computed and has a recorded winner. |
| **Cancelled** | A poll that's been nullified (by admin, or by having no votes). |
| **Lazy instantiation** | First visit to a template's "today" triggers the poll row creation. |
| **Lazy finalization** | First visit after close time triggers winner computation. |
| **Allowlist** | The `users` table. Only emails on this list can sign in. |
| **Display name** | How a user wants to be shown. Falls back to email. |

## 9. Technical constraints the design should respect

**Stack**: Next.js 16 (React 19 + App Router + Server Components), Tailwind CSS 4, Supabase (Postgres + Auth).

**What's cheap**:
- Anything Tailwind utility classes can express (99% of styling).
- Color palette changes (we're mostly on `neutral-*`, `green-*`, `blue-*`, `amber-*`, `red-*`).
- Copy changes anywhere.
- Adding/reordering sections on any page.
- Adjusting existing dark-mode variants. The `dark:` class system is already wired on every styled element.

**What's moderate**:
- Introducing illustrations or custom SVGs (needs asset pipeline setup but tiny).
- Adding a design-system token layer on top of Tailwind (doable, not done yet).
- Adding transitions/animations — React Server Components render synchronously, so entrance animations need client islands (small wrappers that opt into `"use client"`).
- **Explicit light / dark / follow-system toggle.** Current state is system-follow only via Tailwind's `dark:` variants. Adding a manual override needs: a small client component to read/write the preference (cookie or `localStorage`), a `class="dark"` or `data-theme` on `<html>`, and the toggle UI itself. Not hard, just a multi-file touch.
- **Custom modal primitive.** Need to build a reusable modal/dialog component (Radix Primitives or hand-rolled) to replace the three places we use `window.confirm()`. Should be focus-trapped and keyboard-dismissable.

**What's harder / check first**:
- Anything that requires turning server components into client components (hurts initial load).
- Anything that depends on live-updating shared data (we don't have subscriptions; currently everything re-fetches on navigation or action).
- Anything that breaks the "URL is the source of truth" pattern — filters live in search params, which is good for sharing and bookmarking.

**Branding**: there's no logo, no brand color, no typography system yet. The designer should propose one.

## 10. What's flexible vs. fixed

**Flexible (design freely)**:
- All visual styling, spacing, typography, color.
- All copy and tone.
- Layout within a page.
- How banked credits are visualized.
- How the spectrum (`/people`) is visualized.
- Confirm dialog styling.
- Empty-state illustrations and copy.
- Whether to have a persistent app shell / sidebar / bottom nav.

**Fixed (don't remove without discussion)**:
- The five poll states and their separation.
- The visibility rule: no aggregate live tally during Open; banked credits shown only to the user they belong to.
- The closed-poll breakdown structure (`today N + banked M = total T` per restaurant + voter list).
- The one-template-per-day lock.
- The rolling-credit mechanic itself — its spec lives in [`docs/polls.md`](polls.md).
- URL structure and filters (they're load-bearing for shareability).
- No blocking onboarding. Progressive disclosure only — see §3 and §6.8.

## 11. Screens that are especially design-worthy

If the designer has limited time, these are where good design pays off most:

1. **`/` dashboard** — first impression; sets the tone. Currently just a grid of plain cards.
2. **`/polls/:id` Open view** — where most user action happens. Banked credits, live weight preview, and submit button all compete for attention.
3. **`/polls/:id` Closed view** — the "reveal" moment. Could feel celebratory when your choice wins.
4. **`/people`** — the most visually differentiated page concept ("spectrum"). Currently a stack of bar charts.
5. **`/settings` create-key flow** — the plaintext token reveal is a one-time security moment; design should make "copy this NOW" feel serious without being scary.
6. **`/docs`** (new) — this is the one screen users will actually read, so typography and reading flow matter more than anywhere else. Also where illustrations can earn their keep.

Everything else (admin pages, history lists) can be well-crafted but functional.

## 12. What the designer still gets to propose

Most direction is fixed in §3. A few decisions remain open for the designer to drive:

1. **Specific aesthetic style.** "Fancy / bold / beautiful / warm" leaves a lot of room. Editorial-magazine, playful-consumer, bento-grid, brutalist-revival, neu-skeuomorphic — any of these could land. Propose a mood board or 2–3 directions and confirm with the product owner before detailed work.
2. **Color palette.** Current utility neutrals + status accents (green/blue/red/amber) aren't load-bearing — pick any palette that supports full light/dark parity and keeps the five status colors distinguishable.
3. **Typography.** System stack is fine as a fallback. If a webfont fits your direction, propose one (heads-up on perf cost if it's heavy). Pair at most one display face + one text face.
4. **Illustration kit selection.** Pick a publicly-available kit that matches the direction (unDraw, Storyset, Open Peeps, Humaaans, etc.) and use it consistently. Avoid mixing kits.
5. **Placement of the theme toggle.** Light / dark / follow-system — where does the control live? Header? Settings page only? Floating pill? Keyboard-accessible.
6. **Nav pattern.** Is a persistent app shell warranted, or does the current top-link strip suffice? The nav now carries People / History / Docs / Settings / Admin on desktop — that's 5 links before accounting for sign-out and the app title, which strains horizontally. Mobile pattern in particular needs a proposal (hamburger drawer? bottom tab bar? something smarter?).
7. **Custom modal pattern.** Shape, motion, dismissal affordances for replacing `window.confirm()` across cancel-poll / revoke-key / delete-user. Needs consistent spec across all destructive actions.
8. **The `/people` spectrum visualization.** Currently horizontal bars. This page has the most visual latitude — genuinely interesting visualizations (radar, chord, sparklines per user, something else entirely) are fair game.
9. **Celebratory moment for the winner reveal.** The transition from Open → Closed is emotionally the best moment in the app. Whatever motion/visual language you define for "your pick won" is worth extra attention.

## 13. Pointers into the codebase

For the designer-developer handoff, useful files to reference:

- `app/page.tsx` — home / dashboard.
- `app/polls/[id]/page.tsx` — the five-state poll page.
- `app/polls/[id]/vote-form.tsx` — open-state voting form, including banked-credit annotation.
- `app/people/page.tsx` — spectrum bars.
- `app/settings/page.tsx` — settings shell.
- `app/settings/create-key-form.tsx` — plaintext token reveal.
- `app/admin/layout.tsx` — admin nav.
- `app/docs/` — **does not yet exist**. Will be created alongside the design effort; copy content sourced from `docs/polls.md`, `docs/features.md`, and this file.
- Tailwind config is default (no custom theme yet). Global CSS lives in `app/globals.css`.

---

*Last updated 2026-04-19. Keep this doc honest — if we change a visibility rule, a state, or a core concept, update here and in [`docs/features.md`](features.md) + [`docs/polls.md`](polls.md) together.*
