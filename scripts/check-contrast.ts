/**
 * Compute WCAG AA contrast ratios for every foreground/background token pair
 * we rely on. Run with: `tsx scripts/check-contrast.ts`
 *
 * AA thresholds:
 * - Normal text: 4.5
 * - Large text (>= 18pt / 24px, or 14pt / 18.66px bold): 3.0
 * - UI components / graphical objects: 3.0
 */

type Rgb = { r: number; g: number; b: number }

function hexToRgb(hex: string): Rgb {
    const m = hex.replace('#', '').trim()
    const v = parseInt(m, 16)
    return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 }
}

/** Blend an rgba value with a solid base color. */
function flattenAlpha(
    rgba: { r: number; g: number; b: number; a: number },
    base: Rgb,
): Rgb {
    return {
        r: Math.round(rgba.r * rgba.a + base.r * (1 - rgba.a)),
        g: Math.round(rgba.g * rgba.a + base.g * (1 - rgba.a)),
        b: Math.round(rgba.b * rgba.a + base.b * (1 - rgba.a)),
    }
}

function relativeLuminance({ r, g, b }: Rgb): number {
    const lin = (c: number) => {
        const s = c / 255
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(a: Rgb, b: Rgb): number {
    const L1 = relativeLuminance(a)
    const L2 = relativeLuminance(b)
    const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1]
    return (hi + 0.05) / (lo + 0.05)
}

// ---------- palette ----------
const LIGHT = {
    // surfaces
    'surface-base': hexToRgb('#FBF7F1'),
    'surface-raised': hexToRgb('#F3ECDF'),
    'surface-sunken': hexToRgb('#E6DCC8'),

    // text
    'text-primary': hexToRgb('#1E1A15'),
    'text-secondary': hexToRgb('#6B6054'),
    'text-tertiary': hexToRgb('#7A6E5C'),
    'text-on-accent': hexToRgb('#1E1A15'),

    // brand
    'accent-brand': hexToRgb('#E8A53C'),
    'accent-brand-hover': hexToRgb('#D98C19'),
    'link-fg': hexToRgb('#7A4D0A'),
    'focus-ring': hexToRgb('#7A4D0A'),
    'tomato-500': hexToRgb('#C54A3E'),

    // status foregrounds (darkened to pass AA against tinted backgrounds)
    'status-open-fg': hexToRgb('#4A6534'),
    'status-pending-fg': hexToRgb('#6E4D10'),
    'status-closed-fg': hexToRgb('#2C3F75'),
    'status-cancelled-fg': hexToRgb('#8A2E24'),
    'status-scheduled-fg': hexToRgb('#1E1A15'),

    // banked
    'banked-fg': hexToRgb('#7A4D0A'),
} as const

const DARK = {
    'surface-base': hexToRgb('#14110D'),
    'surface-raised': hexToRgb('#1E1A15'),
    'surface-sunken': hexToRgb('#29241D'),

    'text-primary': hexToRgb('#FBF7F1'),
    'text-secondary': hexToRgb('#C8BCA9'),
    'text-tertiary': hexToRgb('#A59B8C'),
    'text-on-accent': hexToRgb('#14110D'),

    'accent-brand': hexToRgb('#E8A53C'),
    'accent-brand-hover': hexToRgb('#F4B955'),
    'link-fg': hexToRgb('#E8A53C'),
    'focus-ring': hexToRgb('#E8A53C'),
    'tomato-500': hexToRgb('#C54A3E'),

    'status-open-fg': hexToRgb('#8FB26B'),
    'status-pending-fg': hexToRgb('#E8B85C'),
    'status-closed-fg': hexToRgb('#7A93D1'),
    'status-cancelled-fg': hexToRgb('#E06A5E'),
    'status-scheduled-fg': hexToRgb('#D9CDA8'),

    'banked-fg': hexToRgb('#F4CC8E'),
} as const

// Status backgrounds are rgba on top of surface-base/raised. Flatten against
// the underlying surface so ratios reflect what the eye actually sees.
function statusBgLight(rgba: { r: number; g: number; b: number; a: number }) {
    // Status chips usually sit directly on page or card surfaces. Use
    // surface-base for the conservative case.
    return flattenAlpha(rgba, LIGHT['surface-base'])
}
function statusBgDark(rgba: { r: number; g: number; b: number; a: number }) {
    return flattenAlpha(rgba, DARK['surface-base'])
}

const LIGHT_STATUS_BGS = {
    'status-scheduled-bg': { r: 217, g: 205, b: 168, a: 1 }, // butter-400 solid
    'status-open-bg': { r: 107, g: 142, b: 78, a: 0.15 },
    'status-pending-bg': { r: 217, g: 164, b: 60, a: 0.18 },
    'status-closed-bg': { r: 79, g: 107, b: 177, a: 0.14 },
    'status-cancelled-bg': { r: 197, g: 74, b: 62, a: 0.12 },
    'banked-bg': { r: 232, g: 165, b: 60, a: 0.12 },
} as const

const DARK_STATUS_BGS = {
    'status-scheduled-bg': { r: 217, g: 205, b: 168, a: 0.16 },
    'status-open-bg': { r: 143, g: 178, b: 107, a: 0.18 },
    'status-pending-bg': { r: 232, g: 184, b: 92, a: 0.18 },
    'status-closed-bg': { r: 122, g: 147, b: 209, a: 0.18 },
    'status-cancelled-bg': { r: 224, g: 106, b: 94, a: 0.18 },
    'banked-bg': { r: 244, g: 185, b: 85, a: 0.16 },
} as const

// ---------- checks ----------
type Check = {
    label: string
    fg: Rgb
    bg: Rgb
    threshold: number
    mode: 'light' | 'dark'
}

const checks: Check[] = []

function pushBody(mode: 'light' | 'dark'): void {
    const pal = mode === 'light' ? LIGHT : DARK
    const surfaces: Array<keyof typeof pal> = [
        'surface-base',
        'surface-raised',
        'surface-sunken',
    ]
    const texts: Array<{ key: keyof typeof pal; t: number }> = [
        { key: 'text-primary', t: 4.5 },
        { key: 'text-secondary', t: 4.5 },
        { key: 'text-tertiary', t: 3.0 }, // placeholder / meta — AA large
    ]
    for (const s of surfaces) {
        for (const t of texts) {
            checks.push({
                label: `${t.key} on ${s}`,
                fg: pal[t.key],
                bg: pal[s],
                threshold: t.t,
                mode,
            })
        }
    }
}
pushBody('light')
pushBody('dark')

// Primary button: text-on-accent on accent-brand
for (const mode of ['light', 'dark'] as const) {
    const pal = mode === 'light' ? LIGHT : DARK
    checks.push({
        label: `text-on-accent on accent-brand`,
        fg: pal['text-on-accent'],
        bg: pal['accent-brand'],
        threshold: 4.5,
        mode,
    })
    checks.push({
        label: `text-on-accent on accent-brand-hover`,
        fg: pal['text-on-accent'],
        bg: pal['accent-brand-hover'],
        threshold: 4.5,
        mode,
    })
    // Destructive button
    checks.push({
        label: `white on tomato-500`,
        fg: { r: 255, g: 255, b: 255 },
        bg: pal['tomato-500'],
        threshold: 4.5,
        mode,
    })
    // Inline link text on page background
    checks.push({
        label: `link-fg on surface-base (link)`,
        fg: pal['link-fg'],
        bg: pal['surface-base'],
        threshold: 4.5,
        mode,
    })
    checks.push({
        label: `link-fg on surface-raised (link in card)`,
        fg: pal['link-fg'],
        bg: pal['surface-raised'],
        threshold: 4.5,
        mode,
    })
}

// Status badges
const statusPairs: Array<{ fgKey: string; bgKey: string }> = [
    { fgKey: 'status-scheduled-fg', bgKey: 'status-scheduled-bg' },
    { fgKey: 'status-open-fg', bgKey: 'status-open-bg' },
    { fgKey: 'status-pending-fg', bgKey: 'status-pending-bg' },
    { fgKey: 'status-closed-fg', bgKey: 'status-closed-bg' },
    { fgKey: 'status-cancelled-fg', bgKey: 'status-cancelled-bg' },
    { fgKey: 'banked-fg', bgKey: 'banked-bg' },
]
for (const mode of ['light', 'dark'] as const) {
    const pal = mode === 'light' ? LIGHT : DARK
    const bgs = mode === 'light' ? LIGHT_STATUS_BGS : DARK_STATUS_BGS
    const flatten = mode === 'light' ? statusBgLight : statusBgDark
    for (const { fgKey, bgKey } of statusPairs) {
        checks.push({
            label: `${fgKey} on ${bgKey}`,
            fg: pal[fgKey as keyof typeof pal] as Rgb,
            bg: flatten(bgs[bgKey as keyof typeof bgs]),
            threshold: 4.5, // chip text is small
            mode,
        })
    }
}

// Focus ring against page backgrounds (uses --focus-ring)
for (const mode of ['light', 'dark'] as const) {
    const pal = mode === 'light' ? LIGHT : DARK
    for (const s of ['surface-base', 'surface-raised'] as const) {
        checks.push({
            label: `focus-ring on ${s}`,
            fg: pal['focus-ring'],
            bg: pal[s],
            threshold: 3.0, // non-text UI component
            mode,
        })
    }
}

// ---------- report ----------
const rows = checks.map((c) => ({
    mode: c.mode,
    label: c.label,
    ratio: contrast(c.fg, c.bg),
    threshold: c.threshold,
}))

const passes = rows.filter((r) => r.ratio >= r.threshold)
const fails = rows.filter((r) => r.ratio < r.threshold)

function fmt(n: number): string {
    return n.toFixed(2) + ':1'
}

function report(label: string, list: typeof rows): void {
    if (list.length === 0) {
        console.log(`\n${label}: (none)\n`)
        return
    }
    console.log(`\n${label} (${list.length}):`)
    const maxW = Math.max(...list.map((r) => r.label.length))
    for (const r of list) {
        console.log(
            `  [${r.mode.padEnd(5)}] ${r.label.padEnd(maxW)}  ${fmt(r.ratio).padStart(8)}  (need ${fmt(r.threshold)})`,
        )
    }
}

report('PASS', passes)
report('FAIL', fails)

console.log(
    `\nSummary: ${passes.length} pass, ${fails.length} fail, of ${rows.length} checks.`,
)
if (fails.length > 0) process.exit(1)
