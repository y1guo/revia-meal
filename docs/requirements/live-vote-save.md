# Requirements — Live (autosave) voting

Today's Open poll view ([vote-form.tsx](../../app/polls/[id]/vote-form.tsx)) asks the user to check/uncheck restaurants, then click **Update vote** to persist. Two failure modes:

1. User forgets the button and leaves the page — their vote is silently unsaved.
2. User clicks at the last moment, network drops, the single submission is lost.

We want each pick change to save on its own, quickly enough that leaving the tab rarely loses a vote and visibly enough that the user has clear confirmation.

## Goals

- Remove the manual submit button for the common edit case — check / uncheck *is* the vote.
- Debounce saves short (sub-second) and coalesce them: rapid clicking produces at most one save per idle moment.
- Flush any pending change immediately on navigation away / tab close / component unmount.
- Make save state visible: `Saving…` / `Saved` / `Couldn't save — Retry`, with an `aria-live="polite"` announcement for screen readers.
- On transient failure, one automatic retry, then expose the **Retry** affordance.

## Non-goals

- Offline queueing. If the network is down, we show an error and surface the retry — we do not store picks locally and replay later.
- Changing credit semantics, the one-template-per-day lock, or the DELETE+INSERT replacement model on the server. These stay exactly as specified in [polls.md](../polls.md).
- Live aggregate tallies. The aggregate remains hidden during the open window per existing rules.

## Behavior

- **Trigger.** On each check/uncheck, start (or reset) a short debounce. When the debounce elapses, save the full current pick set via the existing `submitVote` server action.
- **Coalescing.** At most one save is in flight per poll at a time. If the pick set changes while a save is in flight, we wait for it to settle and then immediately fire another save with the latest picks. Last write wins, matching today's behaviour.
- **Flush on leave.** A `pagehide` / `visibilitychange: hidden` / component-unmount handler must flush any pending debounced save synchronously (using `fetch` with `keepalive: true` against a lightweight POST route that wraps the same mutation logic). `beforeunload` is *not* used to block navigation — flushing happens silently.
- **No confirmation prompt on navigation.** Per the design brief, we do not use `window.confirm` or any blocking dialog. The flush-on-leave handler is best-effort and invisible.
- **"Clear my picks" action.** A lower-emphasis secondary button replaces the current `Withdraw vote` affordance. It unchecks everything and triggers an immediate (non-debounced) save. The primary submit button is removed.
- **Status indicator.** A compact label in the form footer, wrapped in `aria-live="polite"`:
  - Before the user has interacted in this page lifetime: label is blank. Showing "Saved" on page load would be confusing ("saved what?").
  - `Saving…` — while a save is in flight or pending-debounce with unsaved changes.
  - `Saved` — steady state after at least one successful save in this page lifetime.
  - `Couldn't save — Retry` — after two failed attempts (initial + one auto-retry). The **Retry** button triggers a fresh save of the current picks. Further manual retries are allowed.
- **Existing copy preserved.** The per-pick weight preview (`You picked N · each counts as 1/N credit`) and the "how this works" link stay.

## Edge cases

- **First vote of the day (daily_participation lock).** Unchanged server-side: first successful save creates the participation row. If the user is already locked to another template, the server rejects with the existing message; the status becomes `Couldn't save — Retry`, but retry will keep failing until they clear the other poll. Acceptable.
- **Clear-all when locked to this template.** Unchanged: server deletes the vote rows and the participation row for today. Matches today's "withdraw" behavior.
- **Poll closes mid-edit.** Server rejects (`Voting is pending close.` or `closed`). Status shows the error; no auto-retry for non-transient errors. User sees the message and can no longer edit.
- **Two tabs / two devices.** Last write wins, same as today. No merge attempt.
- **Save during very fast clicking.** Debounce ensures only the idle state is persisted. Intermediate flickers never hit the server.
- **Tab closed during debounce window.** Flush handler fires; if `fetch(..., keepalive: true)` can't complete before the browser tears down, the vote may be lost. Document this residual risk — there is no universal fix.

## Success criteria

- Checking a restaurant, then closing the tab ~1s later, results in the vote being saved on the server (verified in DB).
- The status indicator reaches `Saved` within ~1 second of the last interaction under normal network conditions.
- Simulating an offline network shows `Couldn't save — Retry`; going back online and clicking Retry saves successfully.
- No regression to existing error messages (`not on the ballot`, `already voted in another poll today`, etc.) — they still surface in the status line.
- Manual Playwright MCP check: open a poll, toggle picks, navigate away without clicking any button, reopen the poll, picks are still reflected.

## Out of scope for this gap

- Replacing the `Clear my picks` button styling beyond basic secondary-button treatment — design polish handled separately.
- The per-poll restaurant snapshot / admin-edit work (tracked as gap #3) — disabled-option UX arrives with that gap.
