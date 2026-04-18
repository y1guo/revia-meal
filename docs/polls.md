# Polls, voting, and rolling credits

## Poll templates

A **poll template** is a reusable configuration for a recurring lunch poll:

- a name (e.g. "Regular", "Healthy food"),
- a schedule (days of the week, open time, close time, timezone),
- a set of restaurants drawn from the shared catalog.

A template **instantiates a new poll each day it runs**. Each concrete poll has its own id and its own URL. Opening that URL after the poll has ended shows the results view for that specific day — links do not drift to a newer poll.

Polls are instantiated lazily: when the app sees a scheduled template with no poll row for today, it creates one. We do not backfill past dates.

## Voting rules

1. Each user gets a **fixed amount of daily credits**.
2. A user may participate in **only one template's poll per day**. Once they vote in a template, they are locked out of any other template's poll that same calendar day.
3. Inside a poll, the user picks any subset of the listed restaurants. Their credits for that poll are **distributed evenly** across the restaurants they picked.
4. When the poll closes, the restaurant with the highest total weight wins.

## Rolling credits — concept only

The novel feature of the app is that **un-winning credits are not wasted**. Credits spent on non-winning restaurants can roll forward so that, over time, a user whose taste is consistently outvoted eventually accumulates enough power to swing a poll toward their pick.

Credit balances are tracked **per user per template**, because each template is an independent "lunch world": unspent credits in Regular do not bleed into Healthy, and vice versa.

## What is deliberately NOT decided yet

The exact policy for how credits move is the single most important design decision in the app, and we are intentionally leaving it open until we sit down to design it. Concretely, all of the following are open:

- Do rolled-over credits decay over time, or accumulate indefinitely?
- Are fresh daily credits and rolled-over credits weighted equally?
- When a restaurant wins, do we deduct credits from voters who backed it — all of their spend, a fixed amount, a proportional amount?
- What happens to credits from voters who backed non-winners — fully preserved, partially preserved, something smarter?
- How do we treat users who did not vote on a given day — do they still gain daily credits?
- Is there a per-user credit cap to prevent one person from eventually dominating?
- How do we seed brand-new users — zero credits, or a starter balance?

Until a policy is chosen, the implementation uses a simple placeholder (e.g. winner deducts all credits from its backers; non-winning credits are fully preserved; no decay). The real design is tracked as a dedicated future session.

## Auditability

Every credit change is written to `credit_events` with a reason (`daily_grant`, `spent`, `refund`, ...) and the poll it is tied to. This is how the `/credits` page explains the user's balance, and how we will debug whichever algorithm we ultimately pick.
