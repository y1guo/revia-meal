# Roadmap and open questions

## MVP scope (shipped as of 2026-04-19)

All items in this section are live on `main`.

- Google login restricted to the admin-provisioned allowlist.
- Restaurant catalog CRUD.
- Poll template CRUD (name, schedule, restaurant set).
- Lazy daily poll instantiation from active templates.
- Dedicated per-poll URL with scheduled / open / closed / cancelled views.
- Voting: one credit per poll, one template per user per local date, freely editable during the open window.
- Per-user banked credits per `(user, template, restaurant)` — see [polls.md](polls.md#rolling-credits-per-user-per-restaurant).
- Lazy finalization at `closes_at` — winner + credit exercise in one transaction, or auto-cancel if no votes.
- Admin poll cancellation from `/admin/polls` — expanded during MVP to also cover closed polls, un-exercising credits on unwind.
- History page, `/people` spectrum page, user settings with per-user API keys.
- Admin API endpoints: "get today's poll links", "get poll results" — both authenticated via Bearer tokens.

## Next phase: design refresh + in-app docs

After the functional MVP shipped, product direction is to upgrade the UI from developer-prototype look to something polished and intentional. Complete brief for the designer: [design-brief.md](design-brief.md). Engineering work items derived from that brief:

- **`/docs` page** — new route at `app/docs/`. In-app user manual covering the polling mechanism, rolling credits, how-to guides, glossary, and FAQ. Anchors must be stable and deep-linkable; tooltips elsewhere will point at specific sections. Content sourced from [polls.md](polls.md) and [features.md](features.md), rewritten end-user-friendly.
- **Theme toggle (light / dark / follow-system).** Current state is system-follow only via Tailwind's `dark:` variants. Needs a client-side preference store (cookie or `localStorage`), a `class="dark"` or `data-theme` on `<html>` applied pre-hydration to avoid flash, and toggle UI. Placement is a design decision.
- **Custom modal component primitive.** Replaces every `window.confirm()` (cancel-poll, revoke-api-key, delete-user) and any other destructive-action dialogs. Focus-trapped, keyboard-dismissable, accessible. Probably a Radix Primitives base with brand styling on top, but hand-rolled is acceptable.
- **Responsive redesign pass.** Every page needs to work at 32" 4K, 16" MBP, and ~390–430px mobile. Current state is desktop-first with mobile "renders but overflows." Expect to revisit breakpoints page-by-page.
- **Motion pass.** Transitions, hover states, entrance animations, micro-interactions. Entrance animations will need small `"use client"` wrappers around otherwise-server components. Keep animations well under a second and never gate user action on them.
- **Illustration kit integration.** Pick one publicly available kit (unDraw, Storyset, Open Peeps, etc.) and wire it in. Used in empty states, the `/docs` page, and anywhere the design calls for it.
- **In-UI guidance pass.** Tooltips, info icons (ⓘ) next to non-obvious terms, warm/explanatory empty states, helper text under inputs, inline examples. See [design-brief.md §6.8](design-brief.md) for the pattern catalog and anti-patterns. **No blocking onboarding tours — ever.**
- **Theme and typography tokens.** If the designer proposes a webfont and/or a structured color-token layer on top of Tailwind, wire that up. Otherwise stay on the system stack.
- **Logo placeholder → real asset** when the product owner provides it.

## Known limitations accepted for MVP

- **API keys inherit the owning user's current role.** Promoting a user to admin silently grants their existing keys admin scope; demoting does the reverse. Acceptable for an internal team of ~15 — revisit if we add finer-grained scopes or external integrations.
- **Session / API-key invalidation on deactivation is not forced.** `is_active` is checked on each DB-touching request, so a deactivated user stops working on their next call, but we do not forcibly invalidate an in-flight Supabase auth session or an in-flight SSR render. Acceptable given the trust boundary is the office.

## Explicitly out of scope for MVP

- **DoorDash automation.** For MVP we just surface the winner. Creating the group order stays manual.
- **Voting via API.** Users can generate keys, but regular-user endpoints are not built in MVP.
- **Notifications from inside the app.** The Slack cron is external and pulls through the API.

## Future / later

- Supabase RLS once role separation matters beyond the current small team.
- Stats dashboards (per-restaurant, per-user) beyond the spectrum and history views.
- Receipt / photo uploads via Supabase Storage.
- Multi-office / multi-team support — today the app assumes one office.
- Admin "re-instantiate" action for a cancelled poll.
- A "dry run" view for admins to simulate how a proposed credit-policy change would have affected historical polls.
