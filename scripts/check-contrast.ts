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

// ---------- palette (Boba / Lime / Sunny refresh) ----------
const LIGHT = {
    // surfaces
    'surface-base': hexToRgb('#E6F8FA'), // frost-50
    'surface-raised': hexToRgb('#F6FFFA'), // mint-50
    'surface-sunken': hexToRgb('#E3F3EA'), // mint-100

    // text
    'text-primary': hexToRgb('#2E3A3C'), // slate-700
    'text-secondary': hexToRgb('#4E5A5C'), // slate-600 (derived for AA)
    'text-tertiary': hexToRgb('#6C7A7B'), // slate-500 (owner's grey; tertiary slot)
    'text-on-accent': hexToRgb('#1F2A2C'), // slate-800

    // brand + interaction
    'accent-brand': hexToRgb('#33C5E0'), // boba-400
    'accent-brand-hover': hexToRgb('#1EA8C4'), // boba-500
    'link-fg': hexToRgb('#0F6E85'), // boba-700
    'focus-ring': hexToRgb('#0F6E85'),

    // danger foregrounds for button/chip
    'danger-500': hexToRgb('#F44336'),
    'danger-600': hexToRgb('#D32F2F'),

    // status foregrounds (darker variants pass AA on tinted bg)
    'status-scheduled-fg': hexToRgb('#2E3A3C'),
    'status-open-fg': hexToRgb('#3A6A28'), // lime-800
    'status-pending-fg': hexToRgb('#80611A'), // sunny-800
    'status-closed-fg': hexToRgb('#0F6E85'), // boba-700
    'status-cancelled-fg': hexToRgb('#A5291F'), // danger-700

    // banked
    'banked-fg': hexToRgb('#80611A'), // sunny-800
} as const

const DARK = {
    'surface-base': hexToRgb('#1D2D31'), // teal-900
    'surface-raised': hexToRgb('#2A3C41'), // teal-800
    'surface-sunken': hexToRgb('#243337'), // teal-700

    'text-primary': hexToRgb('#F8FAFB'), // slate-50
    'text-secondary': hexToRgb('#C8D1D3'), // slate-300
    'text-tertiary': hexToRgb('#8FA0A2'), // slate-400
    'text-on-accent': hexToRgb('#1F2A2C'), // slate-800 on boba-300

    'accent-brand': hexToRgb('#66D7EC'), // boba-300
    'accent-brand-hover': hexToRgb('#7EDCF0'),
    'link-fg': hexToRgb('#66D7EC'),
    'focus-ring': hexToRgb('#66D7EC'),

    'danger-500': hexToRgb('#F44336'),
    'danger-600': hexToRgb('#D32F2F'),

    'status-scheduled-fg': hexToRgb('#C8D1D3'), // slate-300
    'status-open-fg': hexToRgb('#A9F095'), // lime-400
    'status-pending-fg': hexToRgb('#FFE082'), // sunny-400
    'status-closed-fg': hexToRgb('#66D7EC'), // boba-300
    'status-cancelled-fg': hexToRgb('#FBB6AF'), // danger-300 — pale pink for AA on tinted dark bg

    'banked-fg': hexToRgb('#FFE082'), // sunny-400
} as const

// Status backgrounds are rgba on top of surface-base/raised. Flatten against
// the underlying surface so ratios reflect what the eye actually sees.
function statusBgLight(rgba: { r: number; g: number; b: number; a: number }) {
    return flattenAlpha(rgba, LIGHT['surface-base'])
}
function statusBgDark(rgba: { r: number; g: number; b: number; a: number }) {
    return flattenAlpha(rgba, DARK['surface-base'])
}

const LIGHT_STATUS_BGS = {
    'status-scheduled-bg': { r: 108, g: 122, b: 123, a: 0.14 }, // slate-500
    'status-open-bg': { r: 143, g: 232, b: 121, a: 0.22 },
    'status-pending-bg': { r: 255, g: 210, b: 94, a: 0.24 },
    'status-closed-bg': { r: 51, g: 197, b: 224, a: 0.16 },
    'status-cancelled-bg': { r: 244, g: 67, b: 54, a: 0.12 },
    'banked-bg': { r: 255, g: 210, b: 94, a: 0.22 },
} as const

const DARK_STATUS_BGS = {
    'status-scheduled-bg': { r: 200, g: 209, b: 211, a: 0.14 },
    'status-open-bg': { r: 169, g: 240, b: 149, a: 0.18 },
    'status-pending-bg': { r: 255, g: 224, b: 130, a: 0.18 },
    'status-closed-bg': { r: 102, g: 215, b: 236, a: 0.18 },
    'status-cancelled-bg': { r: 246, g: 107, b: 96, a: 0.16 },
    'banked-bg': { r: 255, g: 224, b: 130, a: 0.16 },
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
        { key: 'text-tertiary', t: 3.0 },
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
    // Destructive button: white on danger-600 (NOT danger-500 — fails AA)
    checks.push({
        label: `white on danger-600`,
        fg: { r: 255, g: 255, b: 255 },
        bg: pal['danger-600'],
        threshold: 4.5,
        mode,
    })
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
            threshold: 4.5,
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
            threshold: 3.0,
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
