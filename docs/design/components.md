# Component catalog

Spec for every reusable UI component the implementation will need. Tokens come from [tokens.md](tokens.md); per-page layouts consume these in [pages.md](pages.md).

Two goals:
1. An engineer can build any component here without inventing visual decisions.
2. Anyone reviewing a PR has one place to check "does this match the spec."

---

## Conventions

- **Directory.** All shared UI lives under `components/ui/` (primitives) and `components/` (composed / domain).
- **Naming.** PascalCase files matching the component name. One component per file.
- **Props.** Accept `className` (merged via `clsx`) and forward ref where practical. Boolean flags have an `on` default meaning unless the naming inverts (e.g. `disabled`).
- **Styling.** Tailwind utility classes keyed to tokens from [tokens.md](tokens.md). No inline styles except for computed values (flavor-bar segment widths, progress, etc.).
- **A11y.** Every interactive element is keyboard-reachable, has a visible focus ring (saffron, from globals), and a discernible name (label, `aria-label`, or visible text).
- **Client vs server.** Default to server components. A component moves to `"use client"` only if it needs state, effects, refs, or event handlers. Noted per component.

---

## Size scale

Used by Button, IconButton, TextInput, Select, DateField.

| Size | Height | Px | Text | Use |
|---|---|---|---|---|
| `sm` | 32px | 8 | 0.8125rem | Inline list rows, compact admin tables |
| `md` | 40px | 10 | 0.875rem | Default everywhere |
| `lg` | 48px | 12 | 1rem | Prominent primary CTAs (vote submit, create key, sign in) |

Touch targets on mobile must be ≥44px — use `md` at minimum on tappable surfaces, `lg` on primary flows.

---

# Primitives

## Button

Purpose: every clickable action except links and icon-only buttons.

- **Variants:**
  - `primary` — filled saffron. `bg-[var(--accent-brand)] text-[var(--text-on-accent)] hover:bg-[var(--accent-brand-hover)]`.
  - `secondary` — cream surface, espresso text, 1px subtle border. `bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-subtle)]`.
  - `ghost` — transparent; hover adds `bg-[var(--surface-raised)]`. Used in nav, table row actions.
  - `ghost-destructive` — transparent at rest, tomato text. Hover: `bg-tomato-500/8 text-tomato-500`. Used for in-row destructive triggers that open a confirm modal (Revoke key, Delete user, Cancel poll on `/admin/polls`). The confirm modal carries the true destructive weight; this variant is an announcement, not a commitment.
  - `destructive` — filled tomato. `bg-tomato-500 text-white hover:bg-tomato-500/90`. Used **only** as the primary action inside `DestructiveConfirmModal`. Never in-page.
  - `link` — text-only, underlined on hover, saffron color. Used when a button is semantically right but visually wants to recede.
- **Sizes:** `sm` / `md` / `lg` per the size scale.
- **States:**
  - Rest, hover (150ms color/shadow), active (translateY(1px)), focus-visible (saffron ring from globals).
  - `disabled` → `opacity-50 cursor-not-allowed`, no hover effects.
  - `loading` → label swaps to spinner + optional loading text (`Saving…`), button width locked to prevent layout shift.
- **Radius:** `rounded-md` (10px).
- **Icon slot:** optional `leftIcon` / `rightIcon`, 18px, `strokeWidth 1.75`.
- **Motion:** `transition-colors duration-150` by default, `transition-shadow` on primary (subtle elevation lift on hover).
- **Client:** only if it manages its own loading state — otherwise server.
- **Props API:**
  ```ts
  type ButtonProps = {
    variant?: "primary" | "secondary" | "ghost" | "ghost-destructive" | "destructive" | "link";
    size?: "sm" | "md" | "lg";
    loading?: boolean;
    leftIcon?: LucideIcon;
    rightIcon?: LucideIcon;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>;
  ```

## IconButton

Purpose: icon-only actions (close, dismiss, overflow menu).

- Square, sizes 32 / 40 / 48.
- `ghost` variant default; `secondary` for elevated surfaces.
- Always has `aria-label`.
- Tooltip appears on hover/focus after 500ms delay — composed via `Tooltip` primitive.

## Link

Two distinct link styles:

- **Inline prose link** — `text-[var(--accent-brand)] underline underline-offset-2 decoration-1 hover:decoration-2`. Used inside body copy.
- **Nav link** — no underline at rest; underline-from-left animation on hover (saffron, 2px, 180ms). Active route: saffron underline filled. See `TopNav` below.
- **Utility link** — subtle, `text-[var(--text-secondary)] hover:text-[var(--text-primary)]`. Footer, "Learn more →" tooltip exits.

Always use `next/link` for in-app navigation. External links open in new tab + `rel="noreferrer"` + a tiny external-link glyph.

## TextInput

Purpose: single-line text entry.

- Height: per size scale (default `md` = 40px).
- `bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-md`.
- Focus: saffron ring (inherits from globals) + 1px `border-[var(--accent-brand)]`.
- Error: 1px `border-tomato-500`. Error message below (see `FormField`).
- Placeholder: `text-[var(--text-tertiary)]`, never used as a substitute for a label.
- Optional `leftIcon` slot (search, lock, …).
- Optional `trailing` slot for inline actions (clear, copy).
- **Client:** only if controlled.

## Textarea

Same surface / border / focus spec as TextInput. Default rows = 3; max rows = 8 with auto-grow via `field-sizing: content` (modern browsers). Resize handle hidden.

## FormField

Wrapper that pairs label + input + help text + error. Not a heavyweight form library — just consistent vertical rhythm.

```
<FormField
  id="display-name"
  label="Display name"
  help="How your name appears on polls and history."
  error={state?.error}
>
  <TextInput id="display-name" name="display_name" defaultValue={...} />
</FormField>
```

- Gap above input: 6px.
- Gap to help/error: 6px.
- Required asterisk: `*` in saffron, to the right of the label.
- Label: 0.875rem, weight 500, `text-[var(--text-primary)]`.
- Help: 0.8125rem, `text-[var(--text-secondary)]`.
- Error: 0.8125rem, `text-tomato-500` (both modes), optional AlertTriangle 14px inline.
- `aria-describedby` wires help + error ids to the input automatically.

## Checkbox

Custom, not native. Built on Radix Checkbox for focus-trap / keyboard semantics; styled with our tokens.

- 18×18 box, `rounded-sm` (4px), 1.5px border `border-[var(--border-strong)]`.
- Checked: saffron fill, white check (Lucide `Check` at 12px, stroke 2.5).
- Focus: saffron ring offset 2.
- Indeterminate: saffron fill, horizontal dash.
- Hit area padding 6px around box.
- Animated: 180ms ease-out-quart fill + scale 0.9→1 on the check glyph.
- **Client:** yes (Radix).

## Switch

Horizontal toggle. Used for "Active" admin toggles where the on/off meaning is a live state (not a form submission).

- Track: 40×22, `rounded-full`.
- Thumb: 18×18 white, translates 18px on check.
- Off track: `bg-[var(--surface-sunken)]`; On track: saffron.
- Focus: saffron ring.
- **Client:** yes. Use Radix Switch.

## Select

Custom select only — no native `<select>` (brief §3, §6.3).

- Built on Radix Select.
- Trigger matches TextInput size/border.
- Chevron glyph (Lucide `ChevronDown`, 16px) on the right.
- Content: floating panel, `bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-md shadow-md`, 4px padding.
- Item rest: 34px tall, 12px side padding, 0.875rem; hover `bg-[var(--surface-sunken)]`; selected: saffron check + weight 500.
- Max-height 320px with scroll; 14px radius top corners when truncating.
- Placeholder styling matches TextInput.
- Keyboard: Tab focus, ↑↓ navigate, Enter / Space confirm, Esc close.
- **Client:** yes (Radix).

## DateField / DateRangeField

Custom date inputs — native `<input type="date">` UI varies by browser and violates "no native UI" (brief §3).

- **DateField**: TextInput-shaped trigger showing `Apr 18, 2026`. Click opens a popover calendar.
  - Calendar: month header with prev/next chevrons, weekday row, grid. Today highlighted with saffron ring; selected = saffron fill.
  - Built on [`react-day-picker`](https://daypicker.dev/) — small, maintained, styleable via className props.
- **DateRangeField**: two fields side by side labelled `From` / `To`, single popover that spans both selections. Used on `/history` and `/people` filters.
- **Client:** yes.

## StatusBadge

The five poll states. Also used for "revoked" API keys (a sixth variant).

- Shape: rounded-full pill, height 22px, padding 2px 10px, text 0.75rem, weight 500.
- Variants map to `--status-*` tokens:
  - `scheduled` → butter
  - `open` → sage
  - `pending_close` → honey
  - `closed` → indigo
  - `cancelled` → tomato
  - `revoked` → neutral grey (separate: `bg-[var(--surface-sunken)] text-[var(--text-secondary)]`)
- Non-color cue: each status ships with a tiny leading glyph (Lucide: `Calendar` / `Vote` / `Loader` / `Flag` / `X` / `Ban`) — so color-blind users get redundant shape info.
- Copy is always title-case single word or "pending close" (space-substituted from the enum).

## Chip

Generic compact info pill. The banked-credit chip is a special case (see below); this is the general one for metadata tags, filter pills, "you voted" badges, etc.

- Height 24px, padding 3px 10px, text 0.75rem.
- Variants: `neutral` (sunken surface), `accent` (saffron tint), `success` (sage tint), `info` (indigo tint), `danger` (tomato tint).
- Optional leading icon (14px, stroke 1.75).
- Optional trailing close button for filter-chip usage.

## BankedCreditChip

The signature chip. Per direction.md §10.

- Shape: pill, height 26px, padding 4px 10px.
- Colors: `bg-[var(--banked-bg)] text-[var(--banked-fg)]`.
- Content: `<CoinGlyph /> <span className="font-mono tabular-nums">+0.5</span> banked`.
- `CoinGlyph` is 14×14, saffron with a 1px cream highlight on the upper-left edge for a slight stack look.
- Interaction: hover / focus opens Tooltip with `You have half a vote banked for Chipotle from a previous poll. If Chipotle wins and you pick it today, this exercises.` + "Learn more →" link to `/docs#banked-credits`.
- Zero-state: not rendered at all. Never "+0 banked".
- Mobile: long-press opens the tooltip (Radix Tooltip with `delayDuration={0}` on `touchstart`).
- **Client:** yes (tooltip hook).

### CoinGlyph SVG (paste into `components/icons/CoinGlyph.tsx`)

```tsx
export function CoinGlyph({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <ellipse cx="8" cy="11" rx="6" ry="2" fill="var(--color-saffron-700)" opacity="0.35" />
      <circle cx="8" cy="8" r="6" fill="var(--color-saffron-500)" />
      <circle cx="8" cy="8" r="6" fill="none" stroke="var(--color-saffron-700)" strokeWidth="1" opacity="0.5" />
      <path d="M5.5 7.5 Q6.5 5 8 5 Q9.5 5 10.5 7.5" fill="none" stroke="var(--color-saffron-700)" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}
```

## Tooltip

Built on Radix Tooltip.

- Content surface: `bg-[var(--text-primary)] text-[var(--surface-base)]` (inverted for contrast).
- 0.75rem text, weight 400.
- Padding 6px 10px, `rounded-md`.
- Max width 280px; wraps.
- 180ms fade + 4px translate on open; 120ms fade on close.
- Arrow: 6px triangle, same color.
- `delayDuration={400}` default; `0` for tap-triggered mobile usage.
- Esc dismisses; outside click dismisses on mobile tap.
- **Client:** yes.

## InfoIcon

Composition of Lucide `Info` + Tooltip.

- 14px icon, `text-[var(--text-secondary)]`, inline with preceding label.
- Subtle hover underline by hover-styling the parent wrapper.
- Every InfoIcon tooltip ends with a `Learn more →` link into `/docs#<anchor>` (brief §6.8, direction.md §14).

## Card

Low-elevation surface wrapper.

- `bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-lg shadow-[var(--shadow-card-rest)]`.
- Padding: 20px on desktop, 16px on mobile.
- Hover variant (when used as a link): translate -2px + `shadow-[var(--shadow-card-hover)]` + 140ms transition on both.
- Reduced motion: no translate, shadow change only.
- Slot pattern: `<Card.Header>`, `<Card.Body>`, `<Card.Footer>` for consistent rhythm — or just pass children if flat.

## EmptyState

Used in every list-empty scenario. Warm, explanatory, never just "No results."

- Vertical stack, centered, max-width 360px, 48px vertical padding.
- Optional illustration (120×120 SVG from Storyset, saffron or sage tint).
- Title: Fraunces 500, 1.125rem.
- Body: Geist Sans 400, 0.875rem, `text-[var(--text-secondary)]`.
- Optional primary button CTA.
- Per-page copy inventory lives in [pages.md](pages.md).

## Avatar

Used in the top bar and voter lists.

- 32px default; 24px for voter-list inline chips; 40px for settings header.
- Round, `bg-[var(--surface-sunken)]`.
- Content: first initial of display name (or email's first char) in Fraunces 500, `text-[var(--text-primary)]`.
- No image support for MVP — Google photos aren't wired through yet. Text only.

## Skeleton

Loading placeholder. Used on initial dashboard / history / people loads where server components defer.

- `bg-[var(--surface-sunken)] rounded-md animate-pulse` — Tailwind's built-in pulse is fine; opacity 0.6 → 1 cycle.
- Sizes: let the caller size with width/height classes.
- Reduced motion: no pulse; just flat surface at 0.6 opacity.

---

# Composed

## Modal (base dialog)

Built on Radix Dialog. Direction.md §7.

- **Overlay:** full viewport, `bg-[rgba(30,26,21,0.45)] backdrop-blur-[4px]`. Fades 140ms.
- **Content:** max-width 480px desktop, `calc(100% - 32px)` mobile. Centered. `bg-[var(--surface-raised)] rounded-[14px] shadow-[var(--shadow-modal)]`.
- **Padding:** 24px.
- **Motion:** enter opacity 0→1 + scale 0.95→1 (180ms, ease-out-quart); exit 120ms reverse.
- Reduced motion: cross-fade only.
- **Focus trap:** built-in via Radix.
- **Dismissal:** Esc, backdrop click, explicit cancel button.
- **Structure slots:** `Modal.Icon` (optional 40×40 circle), `Modal.Title`, `Modal.TargetChip` (optional compact chip naming the target), `Modal.Body`, `Modal.Warning` (optional tomato strip), `Modal.Footer`.
- **Client:** yes.

## DestructiveConfirmModal

Opinionated wrapper around Modal for cancel-poll / revoke-key / delete-user. Brief §6.3.

- Red icon circle (`bg-tomato-500/12 text-tomato-500`) with Lucide `AlertTriangle` (20px).
- Title is always a question ("Cancel this poll?", "Revoke this key?", "Delete this user?").
- Target chip is always present.
- Body supports 2–3 sentences.
- Irreversible warning strip ("This can't be undone.") with Lucide `AlertCircle` on destructive (cancel-poll is reversible — admin can re-cancel-undo by not using it; per brief, closed polls can be cancelled and credits return. Re-read brief §5.11 before writing copy).
- Footer: Cancel (ghost, left), destructive primary (right). Cancel is **auto-focused**; destructive never is.
- Keyboard: Tab cycles Cancel ↔ Destructive.
- **Props:**
  ```ts
  type DestructiveConfirmModalProps = {
    open: boolean;
    onOpenChange(open: boolean): void;
    title: string;
    target: React.ReactNode; // rendered in target chip
    children: React.ReactNode; // body
    warning?: string;
    destructiveLabel: string;
    onConfirm: () => void | Promise<void>;
  };
  ```

Copy library lives in [pages.md](pages.md) next to each destructive action.

## ThemeToggle

Three-way segmented control. Direction.md §6.

- Horizontal pill, 3 equal segments, 32px tall (desktop), 40px tall (mobile `/settings`).
- `bg-[var(--surface-sunken)] rounded-full p-0.5 border border-[var(--border-subtle)]`.
- Selected segment: `bg-[var(--surface-raised)] shadow-[var(--shadow-card-rest)]`.
- Icons + labels: `Sun` Light / `Moon` Dark / `MonitorSmartphone` System (Lucide), 16px. Labels visible on desktop; icons-only at very narrow widths.
- Keyboard: arrow keys to change, Enter / Space to select. ARIA `role="radiogroup"`.
- On change: write cookie, apply class, kick `ThemeSync` listener (see [tokens.md](tokens.md) §3).
- **Client:** yes.

## AvatarMenu

Dropdown triggered from the top-bar avatar. Built on Radix DropdownMenu.

- Trigger: Avatar (32px) + `ChevronDown` 14px, grouped, ghost-button hit area.
- Panel width: 280px, `bg-[var(--surface-raised)] rounded-lg shadow-[var(--shadow-card-hover)] border border-[var(--border-subtle)]`, 6px padding.
- Panel contents (top → bottom):
  1. Identity block — Avatar (40px) + display name (weight 500) + email (text-secondary, 0.75rem) + admin chip if admin. Non-interactive.
  2. Divider.
  3. `Settings` menu item (icon `Settings` 16px + label).
  4. Appearance section — `ThemeToggle` inline, 36px tall, full-width.
  5. Divider.
  6. `Sign out` menu item (icon `LogOut`, tomato-500 text at rest? No — keep neutral; destructive color is reserved for truly destructive actions, sign-out is safe).
- Motion: 180ms fade + 4px translate on open.
- **Client:** yes.

## TopNav (desktop, ≥md)

Direction.md §5.

- Sticky top, `bg-[var(--surface-base)]/80 backdrop-blur-[8px] border-b border-[var(--border-subtle)]`, 64px tall.
- Left: brand wordmark (`revia·meal`, Fraunces 600, with saffron-filled interpunct plate glyph between words). Link to `/`.
- Center: nav links `Today` / `History` / `People` / `Docs`. Active route has saffron 2px underline, filled from the left on hover (180ms ease-out-quart).
- Right (admin only): `Admin` link + 1px vertical divider + AvatarMenu. Admin link separated so it reads as role-gated, not another primary tab.
- Right (non-admin): AvatarMenu only.
- Motion: active-underline slides between routes on navigation (use Framer Motion layout animation or a CSS `view-transition` wrapper).
- **Client:** for the active-underline animation, a small client island.

## BottomTabs (mobile, <md)

- Fixed bottom, `bg-[var(--surface-base)]/95 backdrop-blur-[8px] border-t border-[var(--border-subtle)]`, 64px tall + safe-area-inset-bottom.
- Four tabs: `Today` / `History` / `People` / `Docs` (Admin goes through AvatarMenu on mobile).
- Each tab: 24px icon (Lucide `Utensils` / `History` / `Users` / `BookOpen`) above 0.6875rem label, centered.
- Active: saffron icon + label; inactive: `text-[var(--text-secondary)]`.
- Tap target: 64px wide × 56px tall minimum.
- Hides on `/login`.
- **Client:** yes (to read current path).

## AdminSubNav

Horizontal strip under the TopNav on `/admin/*`. Not present on mobile — admin pages on mobile use a single-route breadcrumb dropdown (see [pages.md](pages.md) `/admin` section).

- 44px tall, `bg-[var(--surface-raised)] border-b border-[var(--border-subtle)]`.
- Items: Users / Restaurants / Templates / Polls. Saffron underline on active. Same affordance as TopNav.
- Left-padded to align with the container.

## PageHeader

Every non-login page starts with one.

- Structure: title (Fraunces 600, 1.5rem desktop / 1.25rem mobile) + optional subtitle (`text-[var(--text-secondary)]`, 0.875rem) + optional right-aligned action slot.
- Bottom margin 24px before content.
- On mobile, title and action stack vertically if action is present.

## AppShell

Client-or-server layout wrapper used by `app/layout.tsx` (the authenticated routes; `/login` skips the shell).

- Renders: pre-hydration theme script → `<ThemeSync />` → TopNav (desktop) → `<main>` with container padding → BottomTabs (mobile) → `<Toaster />`? No toasts per brief §6.5; skip.
- `<main>` padding: 24px top, 16px sides on mobile / 24px sides on laptop / 32px sides on large desktop. Bottom padding gives room above the mobile tab bar (80px).
- Container max-widths come from the per-page rules in [pages.md](pages.md).

---

# Motion tokens summary

All motion in every component references these — keep the vocabulary tight.

| Token | Value | Used for |
|---|---|---|
| `duration-fast` | 120ms | Dismissals, exit |
| `duration-std` | 180ms | Primary hover / open |
| `duration-enter` | 240ms | Entrances, stagger base |
| `duration-reveal` | 700ms | Winner reveal only |
| `ease-out-quart` | `cubic-bezier(0.25,1,0.5,1)` | Entrances |
| `ease-in-quart` | `cubic-bezier(0.5,0,0.75,0)` | Exits |
| `spring(300,30)` | framer-motion | Optimistic feedback (vote submit pop) |

`prefers-reduced-motion: reduce` → cross-fades only, 120ms, no translate / scale / stagger.

---

# Accessibility baseline (applies to every component)

- Visible focus ring on every interactive element (globals handle this).
- Minimum 4.5:1 text contrast (WCAG AA) — measure every token pair.
- No meaning conveyed by color alone — status badge glyphs, error icon, required asterisk + `aria-required`, etc.
- Dialogs trap focus and return focus on close.
- Labels associated with inputs via `id` / `htmlFor`.
- Live regions (`aria-live="polite"`) for form success / error announcements when submitting without a full page transition.
- All keyboard shortcuts are visible on hover/focus; no invisible ones.
