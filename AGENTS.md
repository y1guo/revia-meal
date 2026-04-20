<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Self-review after each step the agent owns

Feature work on this project follows a seven-step flow between the user and the coding agent (i.e. Claude Code):

1. The user and the agent discuss feature requirements until the user approves them.
2. The agent writes the requirements doc.
3. The agent writes the implementation plan.
4. The agent writes the code changes.
5. The agent runs tests and fixes the bugs those tests surface.
6. (Optional) The user does a manual review.
7. On the user's word, the agent creates the commit.

Steps 2–5 are driven by the agent. After finishing each of those steps — before moving to the next — the agent must self-review its own output: reread docs, read back `git diff` and scan new files for code changes, check that tests actually asserted what was claimed and nothing else regressed. Look for dead code, redundant casts, unused imports, typos, auth gaps, stale references, race conditions, half-finished paths, leftover logs. Iterate until the review surfaces nothing, then advance. Do not hand off to the user problems a quick self-review would have caught. No separate pre-commit pass is needed — if each step was reviewed clean, the commit is already clean.

# UI / UX work: honor the design brief

Any change to user-facing surfaces (pages, forms, buttons, copy, states, motion, theming, nav) must be consistent with [docs/design-brief.md](docs/design-brief.md). That doc is the source of truth for design direction, responsive targets, theme modes, motion expectations, in-UI guidance patterns, and the page inventory with allowed states.

Two invariants worth surfacing here because they bite often:

- **No blocking onboarding.** Never add multi-step tutorials, coach marks that disable the rest of the app, or modal takeovers that trap focus before letting the user navigate. Progressive disclosure only — tooltips, helper text, info icons, warm empty states. See [design-brief.md §3 and §6.8](docs/design-brief.md).
- **No native system UI.** `window.confirm()`, unstyled `<select>`, default date pickers, etc. must be replaced with custom components that match the brand. If you're about to reach for a native dialog, build or reuse the project's modal primitive instead.

When in doubt, read the relevant section of the design brief first.

The brand palette is **Boba / Lime / Sunny** — documented in [docs/design/palette-refresh.md](docs/design/palette-refresh.md). Components should read semantic CSS vars (`--surface-raised`, `--text-primary`, `--accent-brand`, `--link-fg`, `--focus-ring`, status/banked tokens) defined in [app/globals.css](app/globals.css) rather than raw palette utilities — that's what makes light/dark swap automatic. Run `pnpm exec tsx scripts/check-contrast.ts` after any palette change; 44/44 pairs must still pass WCAG AA.
