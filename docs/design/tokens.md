# Tokens & setup

Concrete translation of [direction.md](direction.md) §2–12 into code-ready configuration. Pastable into `app/globals.css`, `app/layout.tsx`, and a handful of new files.

Scope: colors, typography, spacing, radii, elevation, motion, icon library, theme-mode plumbing. Component-level specs live in [components.md](components.md); per-page layouts live in [pages.md](pages.md).

---

## 1. Tailwind 4 `@theme` — `app/globals.css`

Replace the current stub with the block below. All tokens here become utility classes automatically (`bg-saffron-500`, `text-espresso-600`, `shadow-md`, `rounded-lg`, …).

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* ---------- Raw color scale (Fresh Market) ---------- */
  --color-cream-50:  #FBF7F1;
  --color-cream-100: #F3ECDF;
  --color-cream-200: #E6DCC8;
  --color-cream-300: #C8BCA9;

  --color-espresso-400: #A59B8C;
  --color-espresso-600: #6B6054;
  --color-espresso-900: #1E1A15;
  --color-espresso-950: #14110D;

  --color-saffron-300: #F4CC8E;
  --color-saffron-500: #E8A53C;
  --color-saffron-700: #D98C19;

  --color-sage-400:  #8FB26B;
  --color-sage-500:  #6B8E4E;

  --color-indigo-400: #7A93D1;
  --color-indigo-500: #4F6BB1;

  --color-honey-400: #E8B85C;
  --color-honey-500: #D9A43C;

  --color-butter-400: #D9CDA8;
  --color-butter-700: #8A7E5F;

  --color-tomato-400: #E06A5E;
  --color-tomato-500: #C54A3E;

  /* ---------- Typography ---------- */
  --font-display: var(--font-fraunces), ui-serif, Georgia, serif;
  --font-sans:    var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono:    var(--font-geist-mono), ui-monospace, Menlo, monospace;

  /* ---------- Spacing additions (defaults already cover most) ---------- */
  --spacing-18: 4.5rem; /* 72 — used between waves of content */

  /* ---------- Radii ---------- */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-pill: 999px;

  /* ---------- Shadows (light mode values) ---------- */
  --shadow-sm: 0 1px 2px rgba(30,26,21,0.06);
  --shadow-md: 0 8px 24px rgba(30,26,21,0.08);
  --shadow-lg: 0 16px 48px rgba(30,26,21,0.12);

  /* ---------- Motion ---------- */
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-in-quart:  cubic-bezier(0.5, 0, 0.75, 0);
}

/* ---------- Semantic tokens — light mode ---------- */
:root {
  --surface-base:   var(--color-cream-50);
  --surface-raised: var(--color-cream-100);
  --surface-sunken: var(--color-cream-200);
  --border-subtle:  var(--color-cream-200);
  --border-strong:  var(--color-espresso-400);

  --text-primary:   var(--color-espresso-900);
  --text-secondary: var(--color-espresso-600);
  --text-tertiary:  var(--color-espresso-400);
  --text-on-accent: var(--color-cream-50);

  --accent-brand:       var(--color-saffron-500);
  --accent-brand-hover: var(--color-saffron-700);

  --status-scheduled-bg: var(--color-butter-400);
  --status-scheduled-fg: var(--color-espresso-900);
  --status-open-bg:      rgba(107,142,78,0.15);
  --status-open-fg:      var(--color-sage-500);
  --status-pending-bg:   rgba(217,164,60,0.18);
  --status-pending-fg:   #9C6F1A;
  --status-closed-bg:    rgba(79,107,177,0.14);
  --status-closed-fg:    var(--color-indigo-500);
  --status-cancelled-bg: rgba(197,74,62,0.12);
  --status-cancelled-fg: var(--color-tomato-500);

  --banked-bg: rgba(232,165,60,0.12);
  --banked-fg: var(--color-saffron-700);

  --shadow-card-rest:  var(--shadow-sm);
  --shadow-card-hover: var(--shadow-md);
  --shadow-modal:      var(--shadow-lg);
}

/* ---------- Semantic tokens — dark mode ---------- */
.dark {
  --surface-base:   var(--color-espresso-950);
  --surface-raised: var(--color-espresso-900);
  --surface-sunken: #29241D;
  --border-subtle:  rgba(251,247,241,0.08);
  --border-strong:  rgba(251,247,241,0.24);

  --text-primary:   var(--color-cream-50);
  --text-secondary: var(--color-cream-300);
  --text-tertiary:  var(--color-espresso-400);
  --text-on-accent: var(--color-espresso-950);

  --accent-brand:       var(--color-saffron-500);
  --accent-brand-hover: #F4B955;

  --status-scheduled-bg: rgba(217,205,168,0.16);
  --status-scheduled-fg: var(--color-butter-400);
  --status-open-bg:      rgba(143,178,107,0.18);
  --status-open-fg:      var(--color-sage-400);
  --status-pending-bg:   rgba(232,184,92,0.18);
  --status-pending-fg:   var(--color-honey-400);
  --status-closed-bg:    rgba(122,147,209,0.18);
  --status-closed-fg:    var(--color-indigo-400);
  --status-cancelled-bg: rgba(224,106,94,0.18);
  --status-cancelled-fg: var(--color-tomato-400);

  --banked-bg: rgba(244,185,85,0.16);
  --banked-fg: var(--color-saffron-300);

  /* Dark mode replaces drop shadows with 1px inner borders (brief §11 elevation note) */
  --shadow-card-rest:  0 0 0 1px rgba(251,247,241,0.08);
  --shadow-card-hover: 0 0 0 1px rgba(251,247,241,0.14);
  --shadow-modal:      0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(251,247,241,0.08);
}

/* ---------- Base element defaults ---------- */
html { color-scheme: light dark; }
.dark { color-scheme: dark; }

body {
  background: var(--surface-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-feature-settings: "ss01", "cv11";
}

/* Saffron focus ring — 2px width, 2px offset */
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--color-saffron-500);
  outline-offset: 2px;
  border-radius: inherit;
}

/* Reduced motion — clamps all CSS animation; JS motion must check matchMedia */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 120ms !important;
  }
}
```

**Semantic-token rule of thumb.** For anything that must swap across light/dark, apply the semantic CSS variable through Tailwind's arbitrary-value syntax, e.g. `className="bg-[color:var(--surface-raised)] text-[color:var(--text-primary)]"`. Raw palette utilities (`bg-cream-50`) are reserved for one-off accents that never swap.

Brief §3 calls out "no mixing kits / no clashing accents" — in code, that lands as: don't reach for a raw palette hue inside a surface that a user might view in either mode.

---

## 2. Fonts — `app/layout.tsx`

```tsx
import { Fraunces, Geist, Geist_Mono } from "next/font/google";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  // Variable font — `weight` is omitted per Next 16's idiom; use `font-weight: 500|600` via Tailwind.
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// <html lang="en" className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
```

Usage:
- Display headings (h1/h2, winner reveal, docs section titles): `className="font-display font-semibold tracking-tight"`.
- Default body: no class — inherits Geist Sans.
- Tabular / mono: `className="font-mono tabular-nums"` — tally line, API key display, code blocks.

Also update `<title>` in `app/layout.tsx` metadata from the default "Create Next App" to `revia · meal` — trivial but wrong today.

---

## 3. Theme mode plumbing

Three modes: `light`, `dark`, `system`. Stored in a cookie named `revia-theme` with values `"light" | "dark" | "system"`. Cookie (not `localStorage`) so the server can read it at first render if we ever need SSR-accurate class application.

### 3.1 Pre-hydration script (prevents flash-of-wrong-theme)

```ts
// lib/theme-script.ts
export const themeScript = `
(function(){
  try {
    var m = document.cookie.match(/(?:^|; )revia-theme=([^;]*)/);
    var pref = m ? decodeURIComponent(m[1]) : 'system';
    var isDark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`.trim();
```

Injected in `RootLayout`:

```tsx
<head>
  <script dangerouslySetInnerHTML={{ __html: themeScript }} />
</head>
```

### 3.2 Toggle component

Three-way segmented control (Light · Dark · System) — see `ThemeToggle` in [components.md](components.md). Lives in the avatar menu (desktop) and on `/settings` (mobile).

### 3.3 Writing the cookie

Client-side on toggle click:

```ts
document.cookie = `revia-theme=${value}; path=/; max-age=${60*60*24*365}; samesite=lax`;
```

Then apply immediately: add/remove `.dark` on `<html>` to avoid a repaint wait. `system` reads `matchMedia('(prefers-color-scheme: dark)').matches`.

### 3.4 Reacting to system changes while on "system"

Register a `matchMedia('(prefers-color-scheme: dark)').addEventListener('change', …)` listener in a mount-time client component (`<ThemeSync />`) that re-applies the class when the user is on `system`. Tear down on unmount.

---

## 4. Icon library — Lucide React

**Pick: `lucide-react`** (MIT, tree-shakable, thin stroke that matches Fresh Market's editorial feel).

Install:

```
pnpm add lucide-react
```

Default stroke width: **1.75** (softer than the 2px default, still legible at 16px). Wrap in a project-local `<Icon>` alias to apply the default:

```tsx
// components/ui/Icon.tsx
import type { LucideIcon } from "lucide-react";
export function Icon({ icon: Cmp, size = 18, ...rest }: { icon: LucideIcon; size?: number } & React.SVGProps<SVGSVGElement>) {
  return <Cmp size={size} strokeWidth={1.75} aria-hidden="true" {...rest} />;
}
```

Per-route imports (`import { History } from "lucide-react"`) keep the bundle tight.

### Custom SVG — `CoinGlyph`

The banked-credit chip's coin-stack glyph isn't in Lucide. Hand-roll at `components/icons/CoinGlyph.tsx`. Spec in [components.md](components.md) under `BankedCreditChip`.

### Illustrations

Storyset "Food & Drink" monochrome SVGs, recolored per screen to saffron or sage. Store under `public/illustrations/<name>.svg`. Per-empty-state assignment lives in [pages.md](pages.md).

Attribution link lives in the `/docs` footer (brief §5.12, wireframe-plan §open-questions #6).

---

## 5. Breakpoints

Tailwind defaults. The three brief-§7 targets land at:

| Target | Tailwind range | Primary layout decision |
|---|---|---|
| Mobile | `<md` (<768) | Bottom tab bar, stacked content, full-bleed |
| Laptop | `md`–`2xl` (768–1535) | Primary design target; top nav, constrained containers |
| Large desktop | `≥2xl` (1536+) | Dashboard / history / people containers widen; other pages stay max-width locked |

Bottom tab bar appears below `md` only. Nav pattern details in [components.md](components.md).

---

## 6. Verification checklist before handing this off

- [ ] `@theme` block compiles clean; `bg-saffron-500` etc. render correctly in JSX.
- [ ] Toggling `.dark` on `<html>` flips every semantic token (smoke-test against dashboard).
- [ ] No FOUC on first paint, either mode.
- [ ] Fraunces + Geist load without layout shift (`font-display: swap`).
- [ ] `prefers-reduced-motion: reduce` shortens all transitions to ≤120ms.
- [ ] All five status badge color pairs meet WCAG AA text contrast in both modes (re-measure after any hue tweak).
- [ ] Saffron focus ring visible against both `surface-base` and `surface-raised` in both modes.
