# Research — Auto-populating restaurants from a DoorDash link (gap #7, partial #8)

This investigates the feasibility of "admin pastes a DoorDash URL, we auto-fill restaurant details" (gap #7 in [feature_gaps.md](../../feature_gaps.md)) and, by extension, the feasibility of richer restaurant content (gap #8).

## Findings

### Official DoorDash APIs

DoorDash's [Developer Portal](https://developer.doordash.com) exposes several API product lines:

- **Drive API** — for *restaurants* to request deliveries from DoorDash's fleet. Not useful for reading restaurant/menu data from the outside.
- **Business & Store APIs** — for *restaurant owners* to provision multiple stores. Again, producer-side.
- **Marketplace APIs** (menu, retail) — read-access to menu/catalog data exists, but **production access is gated**: requires a partner relationship, an integration certification, and a 2-hour live certification call with a DoorDash technical account manager. DoorDash explicitly states it "cannot provide a timeline for certification following development."

**There is no public, self-serve API for third-party apps to read consumer-facing DoorDash restaurant data.** The access model assumes a business relationship.

### Unofficial approaches (scraping)

Public articles describe workable but fragile paths:

- DoorDash's consumer site is Next.js; the full menu structure is embedded in a `__NEXT_DATA__` JSON blob inside a `<script>` tag. Scraping that requires running a full browser context (Puppeteer / Playwright) or an HTTP client that handles the anti-bot protections.
- A GraphQL endpoint (`homePageFacetFeed`) powers the feed and is callable with the right query/variables, but requires reverse-engineering their schema and handling Cloudflare-style bot protection.
- Third-party scraper services (Apify, Scrape.do, Foodspark, Grepsr) productize these approaches for ~$0.001–$0.01 per request.

Risks:

1. **Fragility** — DoorDash can change markup, GraphQL schema, or bot-detection rules any time, breaking us silently.
2. **Terms of Service** — DoorDash's ToS prohibits scraping without written permission. For an internal 15-person office-lunch app, enforcement risk is low, but it's still a policy violation.
3. **Maintenance burden** — every time the markup changes we're on the hook to fix our parser. Not worth it for "saves admin 30 seconds per restaurant added."

### Middle path: Open Graph meta tags

DoorDash restaurant pages *do* emit the standard Open Graph `<meta>` tags (`og:title`, `og:image`, `og:description`) that social media platforms rely on for link previews. These are:

- **Stable** — OG tags are public API surface for Slack, iMessage, Twitter, etc. DoorDash has a strong disincentive to break them, and they rarely change.
- **Targeted** — fetching *just* the HTML head and parsing three meta tags is much lighter than full-page scraping, and less likely to trip bot detection.
- **Sufficient for the 80% case** — gets us the restaurant's official name and cover image. The rest (hours, menu items, popular dishes) is not consistently in OG tags and would still need manual entry.

This is the same pattern Slack uses to unfurl any link pasted into a channel; it's a gray area but essentially normalized on the open web.

## Recommendation

Three options for you to pick:

1. **Skip the parser entirely.** Keep the admin restaurant form as manual-only (with the existing `doordash_url` field). Add an image-upload or image-URL field for the cover (feeds gap #8). Zero maintenance burden.
2. **Ship minimal OG-tag auto-fill.** Server-side fetch of the DoorDash URL → parse `og:title` / `og:image` / `og:description` → pre-fill the restaurant form fields. Admin can still override everything. Pragmatic 80% solution.
3. **Partner API or paid scraper service.** Highest fidelity (full menu, open hours, top items — directly satisfying gap #8), but adds external dependency, cost (~$5–20/month for a scraper service at our usage), and integration work. Probably out of proportion for an internal app of this size.

My read: **option 2**. It gets most of the convenience win from #7 without the maintenance tax of a full scraper, and its output also partially feeds gap #8 (name + cover + blurb is most of the "rich content" UX win).

## If you pick option 2, what #7 looks like

- New server-side utility `lib/doordash-meta.ts` — `fetchDoordashMeta(url): Promise<{title?: string; description?: string; imageUrl?: string}>`. Simple HTTP GET + HTML parse for the three OG tags. No third-party deps.
- Add-restaurant form in `/admin/restaurants` gains a "Prefill from DoorDash link" affordance — paste URL → hit button → fields populate, admin can still edit before saving.
- Schema: if we want to store the auto-fetched `cover_image_url`, that's a small migration (gap #8 territory). For now the OG name + description can land in the existing `name` and `notes` fields.
- Caching: fetch at prefill time, don't cache. Re-run only on re-paste.
- Error handling: if the fetch fails, or the URL isn't a DoorDash URL, or the meta tags are missing — show "Couldn't read DoorDash page. Fill manually." and leave the form alone.

## If you pick option 3

Out of scope for me without a budget and service selection. Happy to evaluate specific services if you want.

## If you pick option 1

Zero code change for #7. Gap #8 becomes a pure schema-and-form exercise: `cover_image_url`, `description` (maybe `open_hours` — see gap #5), all admin-entered.

---

**I'm pausing here for your call.** Both gap #7 and #8 depend on which option you pick, and if you pick option 2 gap #8 partially collapses into #7. Tell me which and I'll proceed. In the meantime I'll work on #9 (README) since it's the only other unblocked gap.

Sources:
- [DoorDash Developer Services](https://developer.doordash.com/en-US/docs/drive/how_to/build_for_restaurants/) — official Drive API docs, production-access gating
- [DoorDash Third-Party Providers / Marketplace integration](https://developer.doordash.com/en-US/docs/marketplace/retail/how_to/third_party_providers/) — partner-level access model
- [How to Scrape DoorDash — Scrape.do](https://scrape.do/blog/doordash-scraping/) — technical walkthrough of `__NEXT_DATA__` blob and GraphQL feed
- [WebHarvy DoorDash scraping blog](https://www.webharvy.com/blog/scrape-doordash-restaurant-data/) — general scraping approach and cautions
