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

// ---------- palette (Aurora — violet & emerald on ink) ----------
const LIGHT = {
    // surfaces
    'surface-base': hexToRgb('#FAFAFC'), // cloud-50 (neutral near-white)
    'surface-raised': hexToRgb('#FFFFFF'), // cloud-0
    'surface-sunken': hexToRgb('#ECECF0'), // slate-100

    // text
    'text-primary': hexToRgb('#1F232C'), // slate-800 (near-black)
    'text-secondary': hexToRgb('#4B5160'), // slate-600 (derived for AA)
    'text-tertiary': hexToRgb('#6B7280'), // slate-500
    'text-on-accent': hexToRgb('#FFFFFF'), // white on violet

    // brand + interaction
    'accent-brand': hexToRgb('#7C3AED'), // violet-400
    'accent-brand-hover': hexToRgb('#6D28D9'), // violet-500
    'link-fg': hexToRgb('#5B21B6'), // violet-600
    'focus-ring': hexToRgb('#7C3AED'), // violet-400

    // danger foregrounds for button/chip
    'danger-500': hexToRgb('#F43F5E'),
    'danger-600': hexToRgb('#C81E4A'),

    // status foregrounds (darker variants pass AA on tinted bg)
    'status-scheduled-fg': hexToRgb('#1F232C'), // slate-800
    'status-open-fg': hexToRgb('#086045'), // emerald-700
    'status-pending-fg': hexToRgb('#8A5200'), // dark amber
    'status-closed-fg': hexToRgb('#5B21B6'), // violet-600
    'status-cancelled-fg': hexToRgb('#A3173C'), // danger-700 (rose)

    // banked
    'banked-fg': hexToRgb('#115E72'), // cyan-700
} as const

const DARK = {
    'surface-base': hexToRgb('#0D0D0D'), // ink-950 (near-black)
    'surface-raised': hexToRgb('#1C1C20'), // ink-800
    'surface-sunken': hexToRgb('#151518'), // ink-900

    'text-primary': hexToRgb('#F6F7F9'), // slate-50
    'text-secondary': hexToRgb('#C2C4CD'), // slate-300
    'text-tertiary': hexToRgb('#9398A4'), // slate-400
    'text-on-accent': hexToRgb('#0D0D0D'), // ink-950 on bright violet

    'accent-brand': hexToRgb('#A78BFA'), // violet-300
    'accent-brand-hover': hexToRgb('#B9A4FC'),
    'link-fg': hexToRgb('#A78BFA'),
    'focus-ring': hexToRgb('#A78BFA'),

    'danger-500': hexToRgb('#F43F5E'),
    'danger-600': hexToRgb('#C81E4A'),

    'status-scheduled-fg': hexToRgb('#C2C4CD'), // slate-300
    'status-open-fg': hexToRgb('#34D399'), // emerald-300
    'status-pending-fg': hexToRgb('#FBBF24'), // warning-400 (amber)
    'status-closed-fg': hexToRgb('#A78BFA'), // violet-300
    'status-cancelled-fg': hexToRgb('#FDA4AF'), // danger-300 — pale rose for AA on tinted dark bg

    'banked-fg': hexToRgb('#22D3EE'), // cyan-300
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
    'status-scheduled-bg': { r: 107, g: 114, b: 128, a: 0.14 }, // slate-500
    'status-open-bg': { r: 16, g: 185, b: 129, a: 0.18 }, // emerald-400
    'status-pending-bg': { r: 245, g: 158, b: 11, a: 0.2 }, // amber
    'status-closed-bg': { r: 124, g: 58, b: 237, a: 0.14 }, // violet-400
    'status-cancelled-bg': { r: 244, g: 63, b: 94, a: 0.12 }, // danger-500 (rose)
    'banked-bg': { r: 6, g: 182, b: 212, a: 0.18 }, // cyan-400
} as const

const DARK_STATUS_BGS = {
    'status-scheduled-bg': { r: 194, g: 196, b: 205, a: 0.14 }, // slate-300
    'status-open-bg': { r: 52, g: 211, b: 153, a: 0.18 }, // emerald-300
    'status-pending-bg': { r: 251, g: 191, b: 36, a: 0.18 }, // warning-400 (amber)
    'status-closed-bg': { r: 167, g: 139, b: 250, a: 0.18 }, // violet-300
    'status-cancelled-bg': { r: 251, g: 113, b: 133, a: 0.16 }, // danger (rose)
    'banked-bg': { r: 34, g: 211, b: 238, a: 0.16 }, // cyan-300
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
