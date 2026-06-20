# DoorDash import — beta bookmarklet with header fallback

## Problem

The stable import bookmarklet (`lib/bookmarklet/source.ts`) selects its anchor
"restaurant" object only from a JSON-LD block that is a food `@type`
(`Restaurant`, `FoodEstablishment`, …) **or** carries `hasMenu` / `servesCuisine`.

Some signed-out DoorDash store pages ship a full standalone `Menu` JSON-LD block
but **no** restaurant-level entity. Example:
`https://www.doordash.com/store/tong-sui-%E7%B3%96%E6%B0%B4-campbell-41047709/101805348/`
(the dessert shop "Tong Sui 糖水"). Its LD blocks are only `Organization` (the
generic DoorDash org), `Menu`, `FAQPage`, `BreadcrumbList`.

On those pages the stable bookmarklet hits `if (!restaurant)` and shows a
**misleading** alert telling the admin to sign out — even though they already are.
The real cause is a DoorDash template variant that omits the restaurant wrapper.

## What's recoverable

Everything the page shows is still available, just not from a restaurant LD entity:

| Field | Stable source (absent here) | Fallback source |
| --- | --- | --- |
| name | `restaurant.name` | DOM `<h1>` |
| cuisines | `restaurant.servesCuisine` | DOM header row ("$$ • Dessert & Sweet Treats") |
| price_range | `restaurant.priceRange` | DOM header price span ("$$") |
| rating | `restaurant.aggregateRating` | DOM header ("4.9" + "(100+)") |
| address | `restaurant.address` | `og:description` ("… at <addr> in <city>.") |
| cover / hero / avatar | DOM (already) | unchanged |
| menu_items | featured DOM + `Menu` block | unchanged |
| hours | "See more" dialog | unchanged |

## Approach

Add a **second, beta** bookmarklet — do **not** modify the stable one. Production
admins keep both buttons during a grace period so the new extractor can be
battle-tested while the stable one remains a guaranteed fallback.

- New file `lib/bookmarklet/source-beta.ts` exporting `BOOKMARKLET_SOURCE_BETA`.
  Same expanded-source-of-truth + minified-export convention as the stable file.
- Same output payload shape (`{ name, doordash_url, rich_content }`) — no
  server-side changes; `decodePrefill` / `sanitizeRichContent` are unchanged, so
  beta imports are validated identically.
- Behaviour delta vs. stable: when no restaurant LD entity is found **but a
  `Menu` block is present** (proof the page shipped its full signed-out payload),
  synthesize the header from DOM + OG instead of bailing. A page with no menu
  data at all (the genuine signed-in case) still shows the sign-out nudge.
- `assembleRating()` also lets the rating count fall back to the compact DOM form
  ("4.9(100+)"), which the stable `scrapeRatingCounts` regex
  ("N ratings • N public reviews") does not match.

## Rollout / grace period

Both bookmarklets render on the admin restaurants page: "Add to revia-meal"
(stable, primary) and "Add to revia-meal (beta)" (secondary). Once the beta is
trusted across enough stores, fold it into the stable source and drop the beta
button in a follow-up.
