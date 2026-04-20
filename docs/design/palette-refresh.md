# Palette refresh — Boba / Lime / Sunny

Supersedes the "Fresh Market" cream/espresso/saffron palette described in [direction.md §1–2](direction.md) and the raw scale in [tokens.md §1](tokens.md). Typography, spacing, radii, motion, and layout are unchanged — this is a **palette swap only**, driven by the new brand color set from the product owner.

The rest of this doc translates that brand color set into code-ready tokens, a11y-safe foregrounds, and a concrete file-by-file implementation plan.

---

## 1. Source palette (owner-provided)

### Core brand
| Role | Hex | Internal token |
| :--- | :--- | :--- |
| Primary — Boba Blue | `#33C5E0` | `--color-boba-400` |
| Secondary — Lunch Lime | `#8FE879` | `--color-lime-500` |
| Accent — Sunny Pick | `#FFD25E` | `--color-sunny-500` |

### Light theme
| Role | Hex | Token |
| :--- | :--- | :--- |
| Main background | `#E6F8FA` | `--color-frost-50` |
| Surface background | `#F6FFFA` | `--color-mint-50` |
| Text primary | `#2E3A3C` | `--color-slate-700` |
| Text secondary (owner) | `#6C7A7B` | `--color-slate-500` — remapped to **text-tertiary** (see §4) |

### Dark theme
| Role | Hex | Token |
| :--- | :--- | :--- |
| Main background | `#1D2D31` | `--color-teal-900` |
| Surface background | `#2A3C41` | `--color-teal-800` |
| Text primary | `#F8FAFB` | `--color-slate-50` |
| Text secondary | `#C8D1D3` | `--color-slate-300` |
| Primary (brighter) | `#66D7EC` | `--color-boba-300` |
| Secondary (brighter) | `#A9F095` | `--color-lime-400` |
| Accent (softer) | `#FFE082` | `--color-sunny-400` |

### Semantic
| Role | Hex | Token |
| :--- | :--- | :--- |
| Success green | `#4CAF50` | `--color-success-500` |
| Warning orange | `#FF9800` | `--color-warning-500` |
| Error red | `#F44336` | `--color-danger-500` |

---

## 2. Derived shades (for a11y + UI depth)

The owner's spec is a seed palette. We derive extra steps so interactive states, chip foregrounds, and borders all have a headroom-correct tone. Derivation is luminance-based — no hue drift.

### Boba (brand blue)
```
boba-50   #E6F8FA   (== frost-50, pale)
boba-100  #CCEDF4
boba-200  #99DAEA
boba-300  #66D7EC   (owner: dark-mode primary)
boba-400  #33C5E0   (owner: light-mode primary)
boba-500  #1EA8C4   (hover / pressed)
boba-600  #148BA6
boba-700  #0F6E85   (a11y: link + focus-ring on pale bg)
boba-800  #0B5566
boba-900  #073D4A
```

### Lime (secondary green)
```
lime-300  #BDEFAE
lime-400  #A9F095   (owner: dark-mode secondary)
lime-500  #8FE879   (owner: primary)
lime-600  #70C855
lime-700  #548F3F
lime-800  #3A6A28   (a11y: status-open-fg on pale bg)
lime-900  #1F4016
```

### Sunny (accent + banked credit)
```
sunny-300  #FFE79A
sunny-400  #FFE082   (owner: dark-mode accent)
sunny-500  #FFD25E   (owner: light-mode accent)
sunny-600  #E0B445
sunny-700  #B48A2C
sunny-800  #80611A   (a11y: banked-fg + status-pending-fg on pale bg)
sunny-900  #4D3A0E
```

### Slate (neutrals, teal undertone)
```
slate-50   #F8FAFB   (owner: dark-mode text-primary)
slate-100  #EDF2F3
slate-200  #DDE4E5
slate-300  #C8D1D3   (owner: dark-mode text-secondary)
slate-400  #8FA0A2
slate-500  #6C7A7B   (owner: light-mode "text-secondary"; we remap — see §4)
slate-600  #4E5A5C   (a11y: text-secondary in light mode)
slate-700  #2E3A3C   (owner: light-mode text-primary)
slate-800  #1F2A2C   (text-on-accent for primary buttons)
slate-900  #141E20
```

### Background surfaces
```
frost-50   #E6F8FA   (light page background)
mint-50    #F6FFFA   (light raised surfaces)
mint-100   #E3F3EA   (light sunken surfaces)
teal-800   #2A3C41   (dark raised)
teal-900   #1D2D31   (dark sunken — owner's original dark-main spec)
teal-950   #0E1618   (dark base — deeper than owner spec for a more restful night mode)
```

Note: the owner-supplied dark-mode background was `#1D2D31`; we push base a step darker (`#0E1618`) and keep `#1D2D31` as the sunken surface. This gives cards and inputs three distinguishable elevations in dark mode while landing on a deeper, less washed-out page color.

### Semantic status scales
```
success-400 #7DC983   (dark-mode chip fg)
success-500 #4CAF50   (owner)
success-700 #2E7A32   (light-mode chip fg — AA on tinted bg)

warning-400 #FFB960   (dark-mode chip fg)
warning-500 #FF9800   (owner)
warning-700 #B36200   (light-mode chip fg — AA on tinted bg)

danger-400 #F66B60   (dark-mode chip fg)
danger-500 #F44336   (owner)
danger-600 #D32F2F   (destructive button bg — AA with white text)
danger-700 #A5291F   (light-mode chip fg — AA on tinted bg)
```

---

## 3. Semantic token map

### Surfaces & borders
| Token | Light | Dark |
| :--- | :--- | :--- |
| `--surface-base` | `frost-50` | `teal-950` |
| `--surface-raised` | `mint-50` | `teal-800` |
| `--surface-sunken` | `mint-100` | `teal-900` |
| `--border-subtle` | `#C9E2E7` (boba-100 + 20% slate) | `rgba(248,250,251,0.08)` |
| `--border-strong` | `slate-400` | `rgba(248,250,251,0.24)` |

### Text
| Token | Light | Dark |
| :--- | :--- | :--- |
| `--text-primary` | `slate-700` | `slate-50` |
| `--text-secondary` | `slate-600` (derived — see §4) | `slate-300` |
| `--text-tertiary` | `slate-500` (owner's #6C7A7B) | `slate-400` |
| `--text-on-accent` | `slate-800` | `slate-800` |

### Brand + interaction
| Token | Light | Dark |
| :--- | :--- | :--- |
| `--accent-brand` | `boba-400` | `boba-300` |
| `--accent-brand-hover` | `boba-500` | `#7EDCF0` |
| `--link-fg` | `boba-700` | `boba-300` |
| `--focus-ring` | `boba-700` | `boba-300` |

---

## 4. Why we remap the owner's "text-secondary" to text-tertiary

The owner's spec names `#6C7A7B` as "text-secondary" (with purpose *"subtitles, helper text, disabled states"*). Measured against the pale `#E6F8FA` background it hits **~4.2:1**, which misses the WCAG AA 4.5:1 threshold for small text (passes AA-large at 3.0:1 only).

Rather than reject the hex, we honor it at a different slot where 3.0:1 is acceptable:

- `--text-tertiary` ← `#6C7A7B` (meta, placeholders, disabled). 3.0:1 threshold, passes.
- `--text-secondary` ← `slate-600 #4E5A5C` (derived). ~5.5:1 on surface-base, passes AA small-text.

This keeps the brand character of the owner's gray while never shipping inaccessible body copy. Identical pattern to how Fresh Market handled saffron-on-cream.

---

## 5. Status chip reassignment

Old Fresh Market mapping leaned on five unrelated hues (butter/sage/honey/indigo/tomato). New palette: reuse the three brand colors + two semantic colors, assigned by lifecycle meaning.

| Status | Meaning | Hue | Light fg | Dark fg |
| :--- | :--- | :--- | :--- | :--- |
| `scheduled` | Upcoming, inert | slate (neutral) | `slate-700` | `slate-300` |
| `open` | Live / accepting | **lime** | `lime-800` | `lime-400` |
| `pending_close` | Transitional | **sunny** | `sunny-800` | `sunny-400` |
| `closed` | Finalized | **boba** (primary) | `boba-700` | `boba-300` |
| `cancelled` | Error / void | danger (red) | `danger-700` | `danger-400` |

Backgrounds are the same hue at low opacity (14–22%) on the current surface, matching today's pattern.

**Banked credit chip** (the brand's core mechanic in [design-brief §4.1](../design-brief.md)) moves from saffron → **sunny**. Rationale: sunny is "gold coin / treasure" semantically, matching the "saved up" notion of a banked credit.

---

## 6. Primary button + destructive button

### Primary button (main CTA)
- Background: `--accent-brand` (boba-400 light, boba-300 dark)
- Foreground: `--text-on-accent` (slate-800 both modes)
- Contrast: slate-800 on boba-400 ≈ **8.2:1** ✓ AA

### Secondary/go-success moments (e.g. vote-confirmed toasts)
- Lime-500 background with slate-800 foreground ≈ 11:1 ✓

### Destructive button (Cancel poll, Revoke key, Delete user)
- Background: `danger-600 #D32F2F` (not `-500`, because `-500 #F44336` fails AA with white foreground — **3.6:1**)
- Foreground: `white`
- Contrast: ~5.8:1 ✓ AA
- Rest/hover: tint bleeds to `danger-500` at `/10` for ghost-destructive variants

---

## 7. Brand wordmark treatment

The `public/brand/wordmark.png` asset is white-on-transparent with a cyan dot over the `i` in Revia. The cyan is already in the `#33C5E0` family — it's visually coherent with the new Boba primary without any asset swap.

The existing `brightness-0 dark:brightness-100` Tailwind filter (see [login-form.tsx:64](../../app/login/login-form.tsx#L64) and [TopNav](../../components/shell/TopNav.tsx)) continues to invert the wordmark to black in light mode. The cyan dot inverts with it (becomes black), which is the acknowledged tradeoff — a dark-variant asset is "nice to have" but not required for MVP.

---

## 8. Files touched by this refresh

### Tokens + docs
- [app/globals.css](../../app/globals.css) — raw palette + both `:root` and `.dark` semantic token blocks
- [docs/design/direction.md](direction.md) — §1 aesthetic direction + §2 color table, mark old section superseded
- [docs/design/tokens.md](tokens.md) — §1 `@theme` block updated
- [scripts/check-contrast.ts](../../scripts/check-contrast.ts) — token values + pairs updated to match

### Code renames (names, not semantics)
Old `tomato-*` Tailwind classes and the one `indigo-500` stray reference no longer have matching raw colors. Two-file refactor pattern:

- `tomato-*` → `danger-*` in: [Button](../../components/ui/Button.tsx), [Modal](../../components/ui/Modal.tsx), [DestructiveConfirmModal](../../components/ui/DestructiveConfirmModal.tsx), [FormField](../../components/ui/FormField.tsx), [TextInput](../../components/ui/TextInput.tsx), [Textarea](../../components/ui/Textarea.tsx), [Select](../../components/ui/Select.tsx), [login-form](../../app/login/login-form.tsx), [vote-form](../../app/polls/[id]/vote-form.tsx)
- `indigo-500` → `boba-500` in [Modal.tsx:83](../../components/ui/Modal.tsx#L83) (non-destructive confirm icon tint)

### Derived palette
- [lib/restaurant-colors.ts](../../lib/restaurant-colors.ts) — rebalance the 12-hue spectrum around Boba/Lime/Sunny anchors so people's flavor bars feel cohesive with the new brand. Hash function and array length stay stable (no re-seeding).

---

## 9. What doesn't change

- Typography (Fraunces + Geist Sans + Geist Mono)
- Spacing scale + breakpoints
- Radii (`--radius-sm/md/lg/pill`)
- Motion curves + reduced-motion handling
- Theme-mode cookie plumbing
- Component API — every primitive (`Button`, `Card`, `Chip`, `StatusBadge`, `EmptyState`, `ThemeToggle`, etc.) keeps its prop surface; only CSS tokens shift

---

## 10. Verification

1. `pnpm tsc --noEmit` clean.
2. `pnpm exec tsx scripts/check-contrast.ts` — all 44 pairs pass (light + dark). If anything regresses, fix before shipping.
3. Playwright visual spot-check: `/login`, `/` (dashboard with and without polls), `/history`, `/people`, `/admin/polls`. Both light and dark mode.
4. Focus ring visible on every interactive element in both modes.
