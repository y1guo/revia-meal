# Requirements — Context-aware back button on poll pages

Today [app/polls/[id]/page.tsx:256](../../app/polls/[id]/page.tsx#L256) renders `<BackLink href="/">Today's polls</BackLink>`. If a user arrives from `/history` (or anywhere else), clicking it always jumps to `/` — they lose their scroll position and any filter state on the previous page. They expect it to behave like the browser back button.

## Goals

- On `/polls/:id`, the back affordance should return to wherever the user came from (within the app).
- If there's no usable prior history (deep link, refresh, first page in session), fall back to `/` so the button is never a dead end.
- Accessible, keyboard-activated, unchanged look and feel.

## Non-goals

- **No change to admin detail pages** (`/admin/templates/:id`, `/admin/users/:id`, `/admin/restaurants/:id`). Those have a single meaningful parent index and `BackLink` with a fixed `href` is correct.
- **No navigation stack restoration** across page reloads or new tabs. Browser history is enough.
- **No breadcrumbs, no drawer, no page-transition animations** — separate design work.

## Behavior

- Render an anchor-styled control that, when clicked:
  - Calls `router.back()` if same-origin history exists.
  - Navigates to `/` (soft, via `next/link`) otherwise.
- Detect "same-origin history" via `document.referrer` on mount: if it's set and shares the current `window.location.origin`, assume we can go back.
- Label: `Back`. Simple and conventional. Avoids the flicker of swapping between "Today's polls" and "Back" on hydration.
- Keyboard: `Enter` / `Space` activate, same as any button / link.

## Success criteria

- Navigate `/ → /polls/:id → click Back` lands on `/`. ✅
- Navigate `/history → /polls/:id → click Back` lands on `/history` (scroll and filter state preserved). ✅
- Open `/polls/:id` via a fresh tab / direct URL → click Back lands on `/`. ✅
- Admin detail pages are unchanged; they continue to jump to their respective index pages.
