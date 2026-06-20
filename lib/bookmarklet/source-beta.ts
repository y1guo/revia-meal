// BETA DoorDash import bookmarklet.
//
// Same contract as lib/bookmarklet/source.ts — it extracts a DoorDash store page
// into the import-review prefill payload ({ name, doordash_url, rich_content }),
// so the server side (lib/rich-content.ts decodePrefill / sanitizeRichContent)
// is unchanged. The only behavioural delta: when a store page ships a standalone
// Menu JSON-LD block but NO restaurant-level entity (e.g. "Tong Sui 糖水"), this
// version rebuilds the header (name / cuisines / price / rating / address) from
// the visible DOM + Open Graph tags instead of bailing with the misleading
// "sign out of DoorDash" alert. See docs/requirements/doordash-import-beta-fallback.md.
//
// This is a deliberate, TEMPORARY fork of source.ts, not a replacement: during a
// grace period prod renders both bookmarklets so the stable one stays a
// guaranteed fallback while this one is battle-tested. Once trusted, fold these
// changes into source.ts and delete this file + its install button.
//
// The placeholder '${REVIA_ORIGIN}' (occurs exactly once) is substituted at
// install time by app/admin/restaurants/bookmarklet-install.tsx.
//
// The MINIFIED single-line export at the bottom is what actually runs. The
// /* EXPANDED */ block below is the source-of-truth — edit it there first, then
// regenerate the minified string by copying the expanded body into a temp .js
// file and running:
//
//   pnpm dlx esbuild tmp.js --minify-whitespace --minify-identifiers
//
// Minification rules (same as source.ts, so the javascript: href survives intact):
//   - Use --minify-whitespace --minify-identifiers, NOT plain --minify: the
//     latter's syntax pass rewrites the multi-line alert() into a template
//     literal with real newlines, which corrupts the single-line href.
//   - Keep the EXPANDED code ASCII-only: write non-ASCII as \uXXXX escapes inside
//     regex/string literals (e.g. [\u2022\u00b7], '\u2026'). esbuild escapes
//     non-ASCII in string literals but passes it through verbatim inside regex
//     literals, so a raw bullet in a regex would leak multibyte bytes into the
//     bookmarklet. (Comments may stay UTF-8 — esbuild strips them.)

/* EXPANDED (readable source, for maintenance):

(function () {
    if (!/(?:^|\.)doordash\.com$/i.test(location.hostname)) {
        alert('This bookmarklet only works on DoorDash restaurant pages.');
        return;
    }
    // DoorDash emits different JSON-LD @types by vertical — Restaurant for most
    // sit-down places, FastFoodRestaurant / CafeOrCoffeeShop / Bakery / BarOrPub
    // for others, and sometimes just FoodEstablishment. We also accept anything
    // advertising a hasMenu/servesCuisine property as a sanity fallback.
    var FOOD_TYPES = [
        'Restaurant',
        'FoodEstablishment',
        'FastFoodRestaurant',
        'CafeOrCoffeeShop',
        'Bakery',
        'BarOrPub',
        'IceCreamShop',
    ];
    function isFoodType(types) {
        for (var ti = 0; ti < types.length; ti++) {
            if (FOOD_TYPES.indexOf(types[ti]) >= 0) return true;
        }
        return false;
    }
    var ldBlocks = document.querySelectorAll('script[type="application/ld+json"]');
    var restaurant = null;
    var menuBlock = null;
    var seenTypes = [];
    for (var i = 0; i < ldBlocks.length; i++) {
        try {
            var d = JSON.parse(ldBlocks[i].textContent || '');
            var arr = Array.isArray(d) ? d : [d];
            for (var j = 0; j < arr.length; j++) {
                var obj = arr[j];
                var t = obj['@type'];
                var types = Array.isArray(t) ? t : [t];
                for (var ki = 0; ki < types.length; ki++) {
                    if (types[ki]) seenTypes.push(String(types[ki]));
                }
                if (!restaurant && isFoodType(types)) restaurant = obj;
                else if (!restaurant && (obj.hasMenu || obj.servesCuisine)) restaurant = obj;
                if (types.indexOf('Menu') >= 0) menuBlock = obj;
            }
        } catch (_) {}
    }
    function getMeta(p) {
        var el = document.querySelector('meta[property="' + p + '"]');
        return el ? (el.getAttribute('content') || null) : null;
    }
    function str(v) {
        return typeof v === 'string' && v.length > 0 ? v : null;
    }
    function num(v) {
        var n = typeof v === 'number' ? v : parseFloat(v);
        return isFinite(n) ? n : null;
    }
    function normCuisines(v) {
        if (Array.isArray(v)) {
            return v.filter(function (c) { return typeof c === 'string' && c; });
        }
        if (typeof v === 'string' && v) return [v];
        return [];
    }
    // DoorDash serves text with HTML entities (&amp;, &#39;, etc.) in JSON-LD. Decode
    // them by rendering through a throwaway element and reading textContent — safe
    // because we only read, never re-innerHTML.
    function decodeEntities(s) {
        if (typeof s !== 'string' || s.indexOf('&') < 0) return s;
        var div = document.createElement('div');
        div.innerHTML = s;
        return div.textContent || s;
    }

    // --- BETA fallback: rebuild the restaurant header from DOM + Open Graph ----
    // Some signed-out store pages (newer/smaller stores; the dessert shop
    // "Tong Sui 糖水" is one) ship a full standalone Menu block but NO
    // restaurant-level JSON-LD entity. The stable bookmarklet bails on those with
    // a misleading "you must be signed in" alert. Instead we scrape the exact
    // header fields that lived on the missing entity (name / cuisines / price /
    // rating / address) from the visible page.
    function scrapeStoreName() {
        var h1 = document.querySelector('h1');
        var n = h1 ? (h1.textContent || '').trim() : '';
        return n || null;
    }
    // Header info row renders bullet-separated tags like "$$ • Dessert & Sweet
    // Treats". Anchor on the price-tier span, climb to the row that holds the
    // bullets, then keep the tags that aren't price / rating / distance noise.
    function scrapeHeaderMeta() {
        var spans = document.querySelectorAll('span');
        var priceSpan = null;
        for (var i = 0; i < spans.length; i++) {
            var t = (spans[i].textContent || '').trim();
            if (/^\${1,4}$/.test(t) && spans[i].children.length === 0) { priceSpan = spans[i]; break; }
        }
        var priceTier = priceSpan ? priceSpan.textContent.trim() : null;
        var cuisines = [];
        if (priceSpan) {
            var row = priceSpan.parentElement;
            for (var up = 0; up < 6 && row; up++) {
                if ((row.innerText || '').indexOf('\u2022') >= 0) break;
                row = row.parentElement;
            }
            if (row) {
                var parts = (row.innerText || '').split('\u2022').map(function (s) { return s.trim(); }).filter(Boolean);
                for (var p = 0; p < parts.length; p++) {
                    var part = parts[p];
                    if (/^\${1,4}$/.test(part)) continue;          // price tier
                    if (/rating|review/i.test(part)) continue;      // rating cluster
                    if (/^\d(?:\.\d)?\s*\(/.test(part)) continue;   // "4.9(100+)"
                    if (/^[\d.,kK+\s()]+$/.test(part)) continue;    // bare numbers
                    if (/\bmi\b|\bmin\b|\$\d/.test(part)) continue; // distance / delivery
                    cuisines.push(part);
                }
            }
        }
        return { priceTier: priceTier, cuisines: cuisines };
    }
    // Rating in the header shows as "4.9" with a "(100+)" count. DoorDash renders
    // it either as one compact span ("4.9(100+)") or a value span beside a count
    // span — handle both. (The stable scrapeRatingCounts regex only matches the
    // "N ratings • N public reviews" long form, which these pages don't show.)
    function scrapeHeaderRating() {
        var spans = document.querySelectorAll('span');
        for (var i = 0; i < spans.length; i++) {
            var t = (spans[i].textContent || '').trim();
            var m = t.match(/^(\d(?:\.\d)?)\s*\((\d[\d.,kK+]*)\)$/);
            if (m) return { value: parseFloat(m[1]), count: m[2] };
        }
        for (var i2 = 0; i2 < spans.length; i2++) {
            var t2 = (spans[i2].textContent || '').trim();
            if (/^\d(?:\.\d)?$/.test(t2)) {
                var v = parseFloat(t2);
                if (v >= 1 && v <= 5) {
                    var parent = spans[i2].parentElement;
                    var ptxt = parent ? (parent.innerText || '') : '';
                    var cm = ptxt.match(/\((\d[\d.,kK+]*)\)/);
                    return { value: v, count: cm ? cm[1] : null };
                }
            }
        }
        return null;
    }
    // og:description reads "Get delivery or takeout from <name> at <addr> in
    // <city>. Order online…" — pull the address out of it.
    function scrapeAddressFromOg() {
        var d = getMeta('og:description');
        if (!d) return null;
        var m = d.match(/\bat\s+(.+?)\s+in\s+([^.]+)\./i);
        if (m) return { streetAddress: m[1].trim(), addressLocality: m[2].trim() };
        return null;
    }
    // Assemble an object shaped like the LD restaurant entity so the rest of the
    // pipeline reads from it unchanged.
    function buildSyntheticRestaurant() {
        var hm = scrapeHeaderMeta();
        return {
            name: scrapeStoreName(),
            servesCuisine: hm.cuisines,
            priceRange: hm.priceTier,
            address: scrapeAddressFromOg(),
            hasMenu: menuBlock,
        };
    }
    // Prefer the LD rating; fall back to the DOM header for the value and/or the
    // count (the compact "(100+)" form the long-form scraper misses).
    function assembleRating() {
        var rv = null, ratings = null, reviews = null;
        if (restaurant.aggregateRating) {
            rv = num(restaurant.aggregateRating.ratingValue);
            var c = scrapeRatingCounts();
            ratings = c.ratings;
            reviews = c.reviews;
        }
        if (rv === null || !ratings) {
            var dr = scrapeHeaderRating();
            if (dr) {
                if (rv === null) rv = dr.value;
                if (!ratings) ratings = dr.count;
            }
        }
        if (rv === null) return null;
        return { value: rv, ratings_count_display: ratings, reviews_count_display: reviews };
    }
    // --------------------------------------------------------------------------

    // Unlike the stable bookmarklet we don't hard-fail when the restaurant LD
    // entity is missing: as long as a standalone Menu block is present (proof the
    // page shipped its full signed-out SEO payload) we synthesize the header from
    // the DOM. Only a page with NO menu data at all (the genuine signed-in case)
    // still gets the sign-out nudge.
    if (!restaurant) {
        if (menuBlock) {
            restaurant = buildSyntheticRestaurant();
        } else {
            alert(
                'Could not read restaurant data from this page.\n\n' +
                'DoorDash hides menu data when you are signed in. ' +
                'Please sign out of DoorDash (or open this page in an incognito / private window) and click the bookmarklet again.'
            );
            return;
        }
    }
    var ogImage = getMeta('og:image');

    // DoorDash doesn't publish the avatar (small round logo) or per-item images
    // in JSON-LD. Both live in the DOM only, so we scrape them here.
    //   Cover (landscape banner): [data-testid="HeroPrimaryImage"] > img
    //   Avatar (small round logo): the other img inside HeroImageContainer
    //   Items: [data-testid="image-action-card-container"] img, alt = item name.
    var avatarImage = null;
    var coverImageDom = null;
    var heroContainer = document.querySelector('[data-testid="HeroImageContainer"]');
    if (heroContainer) {
        var heroImgs = heroContainer.querySelectorAll('img');
        for (var hi = 0; hi < heroImgs.length; hi++) {
            var himg = heroImgs[hi];
            if (himg.closest('[data-testid="HeroPrimaryImage"]')) {
                if (!coverImageDom) coverImageDom = himg.src;
            } else {
                if (!avatarImage) avatarImage = himg.src;
            }
        }
    }
    var itemImageMap = {};
    var itemCards = document.querySelectorAll('[data-testid="image-action-card-container"] img');
    for (var ii = 0; ii < itemCards.length; ii++) {
        var cardImg = itemCards[ii];
        var alt = cardImg.alt && cardImg.alt.trim();
        var src = cardImg.src;
        if (alt && src && !itemImageMap[alt]) itemImageMap[alt] = src;
    }

    var addrObj = restaurant.address || {};
    var addrParts = [
        str(addrObj.streetAddress),
        str(addrObj.addressLocality),
        str(addrObj.addressRegion),
    ].filter(function (p) { return p; });
    var address = addrParts.length > 0 ? addrParts.join(', ') : null;
    // JSON-LD aggregateRating.reviewCount is capped by DoorDash's SEO payload
    // (often 50) and conflates ratings with written reviews anyway. The real
    // page shows two distinct counts as verbatim strings like:
    //     "4k+ ratings • 100+ public reviews"
    // We scrape that span and store both display strings unparsed, so the UI
    // matches DoorDash exactly. Class names are obfuscated, so we match by
    // text regex.
    function scrapeRatingCounts() {
        var spans = document.querySelectorAll('span');
        for (var si = 0; si < spans.length; si++) {
            var sp = spans[si];
            if (sp.children.length > 0) continue; // leaf text only
            var txt = (sp.textContent || '').trim();
            var both = txt.match(/^(\S+)\s+ratings?\s*[\u2022\u00b7]\s*(\S+)\s+public\s+reviews?$/i);
            if (both) return { ratings: both[1], reviews: both[2] };
            var rOnly = txt.match(/^(\S+)\s+ratings?$/i);
            if (rOnly) return { ratings: rOnly[1], reviews: null };
        }
        return { ratings: null, reviews: null };
    }
    var rating = assembleRating();
    var images = [];
    if (Array.isArray(restaurant.image)) images = restaurant.image;
    else if (typeof restaurant.image === 'string') images = [restaurant.image];
    // Prefer the DOM banner over OG (OG is a 1200×672 crop often indistinguishable
    // from the avatar on some restaurant types).
    var coverImage = coverImageDom || ogImage || str(images[0]);
    var heroImage = coverImageDom || str(images[0]) || coverImage;
    // DoorDash sometimes sets restaurant.hasMenu to `true` (a bare boolean) rather
    // than an embedded Menu object. In that case the real Menu lives in a separate
    // top-level LD block. Also, the Menu block's hasMenuSection can be double-nested
    // (array-of-arrays), so we walk recursively.
    var menuRoot = (restaurant.hasMenu && typeof restaurant.hasMenu === 'object')
        ? restaurant.hasMenu
        : menuBlock;
    // Menu item descriptions on DoorDash can run several paragraphs, which
    // blows through the prefill URL cap quickly (base64 * ~1.25 for encoding).
    // Image URLs we keep verbatim because they're load-bearing for the ballot
    // thumbnail; descriptions we truncate.
    function trimLong(s, n) {
        if (typeof s !== 'string') return s;
        if (s.length <= n) return s;
        return s.slice(0, n - 1).replace(/\s+\S*$/, '') + '\u2026';
    }
    var menuItems = [];
    function offerPrice(offers) {
        if (!offers) return null;
        var arr = Array.isArray(offers) ? offers : [offers];
        for (var op = 0; op < arr.length; op++) {
            var off = arr[op];
            if (off && off.price) {
                return typeof off.price === 'string' ? off.price : ('$' + off.price);
            }
        }
        return null;
    }
    function ldImage(it) {
        if (!it) return null;
        if (typeof it.image === 'string') return it.image;
        if (Array.isArray(it.image) && typeof it.image[0] === 'string') return it.image[0];
        return null;
    }
    function pushItem(it) {
        if (menuItems.length >= 10) return;
        if (!it || !str(it.name)) return;
        var itName = decodeEntities(str(it.name));
        var itImage = ldImage(it);
        // Fall back to the DOM-scraped item image map (keyed by name) when
        // JSON-LD didn't include the item's photo. DOM alts and JSON-LD names
        // can drift by HTML entities — try both raw and decoded lookups.
        if (!itImage && itName) {
            if (itemImageMap[itName]) itImage = itemImageMap[itName];
            else if (itemImageMap[it.name]) itImage = itemImageMap[it.name];
        }
        menuItems.push({
            name: itName,
            description: trimLong(decodeEntities(str(it.description)), 240),
            price: str(offerPrice(it.offers)),
            image_url: itImage,
        });
    }
    function walkSections(val) {
        if (!val || menuItems.length >= 10) return;
        if (Array.isArray(val)) {
            for (var x = 0; x < val.length && menuItems.length < 10; x++)
                walkSections(val[x]);
            return;
        }
        // Single section object.
        var items = val.hasMenuItem;
        if (!items) return;
        var itemArr = Array.isArray(items) ? items : [items];
        for (var y = 0; y < itemArr.length && menuItems.length < 10; y++)
            pushItem(itemArr[y]);
    }
    // "Featured Items" is what the restaurant itself curates — that's the
    // glanceable sampler we want on the ballot. JSON-LD only exposes
    // "Most Ordered" / full sections (algorithmic), so scrape the DOM:
    // find the "Featured Items" heading and collect image-action cards until
    // the next heading. Each card gives us name + price + image; descriptions
    // aren't in the card, so we backfill from the full JSON-LD item index.
    function buildLdItemIndex() {
        var index = {};
        for (var bi = 0; bi < ldBlocks.length; bi++) {
            try {
                var d = JSON.parse(ldBlocks[bi].textContent || '');
                var arr = Array.isArray(d) ? d : [d];
                var stack = arr.slice();
                while (stack.length) {
                    var v = stack.pop();
                    if (!v || typeof v !== 'object') continue;
                    if (Array.isArray(v)) {
                        for (var vi = 0; vi < v.length; vi++) stack.push(v[vi]);
                        continue;
                    }
                    if (v.hasMenuItem) {
                        var mi = Array.isArray(v.hasMenuItem) ? v.hasMenuItem : [v.hasMenuItem];
                        for (var mii = 0; mii < mi.length; mii++) {
                            var it2 = mi[mii];
                            if (it2 && typeof it2 === 'object' && typeof it2.name === 'string' && !index[it2.name]) {
                                index[it2.name] = it2;
                            }
                        }
                    }
                    if (v.hasMenuSection) stack.push(v.hasMenuSection);
                    if (v.hasMenu) stack.push(v.hasMenu);
                }
            } catch (_) {}
        }
        return index;
    }
    function findLdMatch(index, name) {
        if (index[name]) return index[name];
        // LD names can be entity-encoded (`&amp;`) while DOM alts are decoded.
        for (var k in index) {
            if (Object.prototype.hasOwnProperty.call(index, k) &&
                decodeEntities(k) === name) return index[k];
        }
        return null;
    }
    // The Featured Items carousel only renders ~5 cards at a time; the rest are
    // accessed by clicking a "Next" arrow which slides the viewport. We click
    // Next until the button disables, the roster stops growing, or we hit a
    // safety ceiling — accumulating unique items by alt text.
    function findFeaturedContainer() {
        var hs = document.querySelectorAll('h1,h2,h3,h4');
        var featured = null;
        for (var i = 0; i < hs.length; i++) {
            if (/^featured\s+items$/i.test((hs[i].textContent || '').trim())
                && hs[i].offsetParent !== null) {
                featured = hs[i]; break;
            }
        }
        if (!featured) return null;
        var cur = featured;
        for (var h = 0; h < 8; h++) {
            cur = cur.parentElement;
            if (!cur) return null;
            if (cur.querySelectorAll('[data-testid="image-action-card-container"]').length > 0) return cur;
        }
        return null;
    }
    function scrapeFeaturedItems(ldIndex, cb) {
        var container = findFeaturedContainer();
        if (!container) return cb([]);
        var collected = {};
        var order = [];
        var clicks = 0;
        var stagnant = 0;
        function collect() {
            var cards = container.querySelectorAll('[data-testid="image-action-card-container"]');
            for (var c = 0; c < cards.length; c++) {
                var card = cards[c];
                var img = card.querySelector('img');
                var alt = img && img.alt ? img.alt.trim() : '';
                if (!alt || !img || !img.src) continue;
                if (collected[alt]) continue;
                var cl = (card.innerText || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
                var priceLine = null;
                for (var li = 0; li < cl.length; li++) {
                    if (/^\$\d/.test(cl[li])) { priceLine = cl[li]; break; }
                }
                var ldMatch = findLdMatch(ldIndex, alt);
                collected[alt] = {
                    name: decodeEntities(alt),
                    description: ldMatch ? trimLong(decodeEntities(str(ldMatch.description)), 240) : null,
                    price: priceLine || (ldMatch ? offerPrice(ldMatch.offers) : null),
                    image_url: img.src || (ldMatch ? ldImage(ldMatch) : null),
                };
                order.push(alt);
            }
        }
        function findNext() {
            var buttons = container.querySelectorAll('button');
            for (var b = 0; b < buttons.length; b++) {
                var btn = buttons[b];
                var lbl = (btn.getAttribute('aria-label') || '').toLowerCase();
                if (lbl.indexOf('next') >= 0
                    && !btn.disabled
                    && btn.getAttribute('aria-disabled') !== 'true') return btn;
            }
            return null;
        }
        function finishWalk() {
            var out = [];
            for (var i = 0; i < order.length && i < 10; i++) out.push(collected[order[i]]);
            cb(out);
        }
        function step() {
            var prev = order.length;
            collect();
            if (order.length === prev) stagnant++; else stagnant = 0;
            if (order.length >= 10 || stagnant >= 2 || clicks >= 15) return finishWalk();
            var nxt = findNext();
            if (!nxt) return finishWalk();
            nxt.click();
            clicks++;
            setTimeout(step, 500);
        }
        step();
    }
    var ldIndex = buildLdItemIndex();
    var name = decodeEntities(str(restaurant.name)) || decodeEntities(str(document.title)) || 'Unknown';
    var sourceUrl = location.origin + location.pathname;
    var richContent = {
        version: 1,
        source: 'doordash',
        source_url: sourceUrl,
        fetched_at: new Date().toISOString(),
        cuisines: normCuisines(restaurant.servesCuisine),
        price_range: str(restaurant.priceRange),
        rating: rating,
        avatar_image_url: avatarImage,
        cover_image_url: coverImage,
        hero_image_url: heroImage,
        address: address,
        menu_items: menuItems,
        hours: null, // populated below
    };
    var payload = {
        name: name,
        doordash_url: sourceUrl,
        rich_content: richContent,
    };

    // Weekly hours only surface after the admin-facing "See more" dialog's inner
    // accordion expands. We click through it programmatically, scrape, close,
    // then open the prefill tab. If the dialog flow fails the import still
    // succeeds with hours=null; admin can configure them in the hours editor.
    var DAY_MAP = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
    function toHHMM(s) {
        if (!s) return null;
        var m = s.replace(/\s+/g, ' ').trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
        if (!m) return null;
        var h = parseInt(m[1], 10);
        var mn = m[2] ? parseInt(m[2], 10) : 0;
        var ampm = m[3].toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        else if (ampm === 'AM' && h === 12) h = 0;
        return (h < 10 ? '0' + h : '' + h) + ':' + (mn < 10 ? '0' + mn : '' + mn);
    }
    function scrapeHours(cb) {
        var seeMore = null;
        var ab = document.querySelectorAll('button,a');
        for (var sm = 0; sm < ab.length; sm++) {
            var cand = ab[sm];
            // Skip hidden/detached buttons — DoorDash keeps a second, invisible
            // "See more" in the DOM that doesn't open the dialog when clicked.
            if (cand.offsetParent === null) continue;
            if (/see\s*more/i.test((cand.textContent || '').trim())) {
                seeMore = cand;
                break;
            }
        }
        if (!seeMore) return cb(null);
        seeMore.click();
        // Poll up to ~4s for the dialog shell to mount, then another ~4s for
        // the accordion opener text to render inside it. DoorDash mounts the
        // dialog in two phases (header shell first, then body); slow networks
        // + cold caches can push the body render past 1.5s.
        var dialogTries = 0;
        (function waitDialog() {
            var dialog = document.querySelector('[role=dialog]');
            if (!dialog) {
                if (dialogTries++ > 40) return cb(null);
                return setTimeout(waitDialog, 100);
            }
            function findOpener() {
                // Opener summary text varies by store state: "Closed" (shop shut),
                // "Open now · Accepting DoorDash orders" (open for orders), etc.
                // Must NOT match the dialog's "Close" action button — `closed`
                // (with a d) is the hours summary; `close` alone is the action.
                var ob = dialog.querySelectorAll('button,[role=button]');
                for (var oi = 0; oi < ob.length; oi++) {
                    var otxt = (ob[oi].textContent || '').trim();
                    if (ob[oi].getAttribute('aria-label')) continue;
                    if (/^close$/i.test(otxt)) continue;
                    if (/(closed|open\s*now|accepting\s+doordash\s+orders)/i.test(otxt)) {
                        return ob[oi];
                    }
                }
                return null;
            }
            function closeDialog() {
                // Prefer the X close button (aria-label="Close Kaizen…"); fall
                // back to the bottom "Close" text button. Plain `/close/i`
                // would match the "Closed" hours-row and collapse it instead.
                var bts = dialog.querySelectorAll('button');
                for (var ci = 0; ci < bts.length; ci++) {
                    var aria = bts[ci].getAttribute('aria-label') || '';
                    if (/^close\s/i.test(aria)) { bts[ci].click(); return; }
                }
                for (var ci2 = 0; ci2 < bts.length; ci2++) {
                    if (/^close$/i.test((bts[ci2].textContent || '').trim())) {
                        bts[ci2].click();
                        return;
                    }
                }
            }
            var openerTries = 0;
            (function waitOpener() {
                var opener = findOpener();
                if (!opener) {
                    if (openerTries++ > 40) { closeDialog(); return cb(null); }
                    return setTimeout(waitOpener, 100);
                }
                opener.click();
            // Poll up to ~3s for the hours to render after the accordion opens.
            var parseTries = 0;
            (function waitParse() {
                var text = dialog.innerText || '';
                // Quick probe: do we see any day-of-week line yet?
                if (!/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/.test(text)) {
                    if (parseTries++ > 30) { closeDialog(); return cb(null); }
                    return setTimeout(waitParse, 100);
                }
                var lines = text.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
                var byDay = {};
                var currentDow = null;
                for (var li = 0; li < lines.length; li++) {
                    var line = lines[li];
                    var dm = line.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:\s*\(Today\))?$/);
                    if (dm) {
                        currentDow = DAY_MAP[dm[1]];
                        if (!byDay[currentDow]) byDay[currentDow] = [];
                        continue;
                    }
                    var rm = line.match(/^(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[-\u2013\u2014]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))$/i);
                    if (rm && currentDow) {
                        var opens = toHHMM(rm[1]);
                        var closes = toHHMM(rm[2]);
                        if (opens && closes) byDay[currentDow].push({ opens_at: opens, closes_at: closes });
                    }
                }
                var out = [];
                for (var d = 1; d <= 7; d++) out.push({ day_of_week: d, ranges: byDay[d] || [] });
                closeDialog();
                var anyRange = false;
                for (var oo = 0; oo < out.length; oo++) if (out[oo].ranges.length > 0) { anyRange = true; break; }
                cb(anyRange ? out : null);
            })();
            })();
        })();
    }

    function finish(hoursValue) {
        richContent.hours = hoursValue;
        var json = JSON.stringify(payload);
        var encoded;
        try {
            encoded = btoa(unescape(encodeURIComponent(json)));
        } catch (e) {
            alert('Could not encode the restaurant data. This is a bug.');
            return;
        }
        // 20k base64 → ~25k URL-encoded, well inside Chrome's ~32k URL cap
        // while leaving headroom for verbose menus. If this ever trips, the
        // import-review page won't open — the admin can add manually.
        if (encoded.length > 20000) {
            alert('Too much data to prefill this page. Add this restaurant manually instead.');
            return;
        }
        window.open(
            '${REVIA_ORIGIN}/admin/restaurants/new?prefill=' + encodeURIComponent(encoded),
            '_blank',
        );
    }

    // Run featured-carousel walk first (it mutates page scroll state), then
    // scrape hours dialog, then encode + open prefill tab.
    scrapeFeaturedItems(ldIndex, function (featuredItems) {
        if (featuredItems && featuredItems.length > 0) {
            for (var fi = 0; fi < featuredItems.length && menuItems.length < 10; fi++) {
                menuItems.push(featuredItems[fi]);
            }
        } else if (menuRoot) {
            walkSections(menuRoot.hasMenuSection);
        }
        scrapeHours(finish);
    });
})();

*/

export const BOOKMARKLET_SOURCE_BETA =
    "(function(){if(!/(?:^|\\.)doordash\\.com$/i.test(location.hostname)){alert(\"This bookmarklet only works on DoorDash restaurant pages.\");return}var de=[\"Restaurant\",\"FoodEstablishment\",\"FastFoodRestaurant\",\"CafeOrCoffeeShop\",\"Bakery\",\"BarOrPub\",\"IceCreamShop\"];function he(e){for(var r=0;r<e.length;r++){if(de.indexOf(e[r])>=0)return true}return false}var w=document.querySelectorAll('script[type=\"application/ld+json\"]');var f=null;var x=null;var me=[];for(var P=0;P<w.length;P++){try{var D=JSON.parse(w[P].textContent||\"\");var j=Array.isArray(D)?D:[D];for(var E=0;E<j.length;E++){var M=j[E];var H=M[\"@type\"];var I=Array.isArray(H)?H:[H];for(var $=0;$<I.length;$++){if(I[$])me.push(String(I[$]))}if(!f&&he(I))f=M;else if(!f&&(M.hasMenu||M.servesCuisine))f=M;if(I.indexOf(\"Menu\")>=0)x=M}}catch(e){}}function G(e){var r=document.querySelector('meta[property=\"'+e+'\"]');return r?r.getAttribute(\"content\")||null:null}function d(e){return typeof e===\"string\"&&e.length>0?e:null}function pe(e){var r=typeof e===\"number\"?e:parseFloat(e);return isFinite(r)?r:null}function ye(e){if(Array.isArray(e)){return e.filter(function(r){return typeof r===\"string\"&&r})}if(typeof e===\"string\"&&e)return[e];return[]}function b(e){if(typeof e!==\"string\"||e.indexOf(\"&\")<0)return e;var r=document.createElement(\"div\");r.innerHTML=e;return r.textContent||e}function Ae(){var e=document.querySelector(\"h1\");var r=e?(e.textContent||\"\").trim():\"\";return r||null}function Se(){var e=document.querySelectorAll(\"span\");var r=null;for(var n=0;n<e.length;n++){var t=(e[n].textContent||\"\").trim();if(/^\\${1,4}$/.test(t)&&e[n].children.length===0){r=e[n];break}}var a=r?r.textContent.trim():null;var u=[];if(r){var l=r.parentElement;for(var c=0;c<6&&l;c++){if((l.innerText||\"\").indexOf(\"\\u2022\")>=0)break;l=l.parentElement}if(l){var h=(l.innerText||\"\").split(\"\\u2022\").map(function(o){return o.trim()}).filter(Boolean);for(var s=0;s<h.length;s++){var m=h[s];if(/^\\${1,4}$/.test(m))continue;if(/rating|review/i.test(m))continue;if(/^\\d(?:\\.\\d)?\\s*\\(/.test(m))continue;if(/^[\\d.,kK+\\s()]+$/.test(m))continue;if(/\\bmi\\b|\\bmin\\b|\\$\\d/.test(m))continue;u.push(m)}}}return{priceTier:a,cuisines:u}}function be(){var e=document.querySelectorAll(\"span\");for(var r=0;r<e.length;r++){var n=(e[r].textContent||\"\").trim();var t=n.match(/^(\\d(?:\\.\\d)?)\\s*\\((\\d[\\d.,kK+]*)\\)$/);if(t)return{value:parseFloat(t[1]),count:t[2]}}for(var a=0;a<e.length;a++){var u=(e[a].textContent||\"\").trim();if(/^\\d(?:\\.\\d)?$/.test(u)){var l=parseFloat(u);if(l>=1&&l<=5){var c=e[a].parentElement;var h=c?c.innerText||\"\":\"\";var s=h.match(/\\((\\d[\\d.,kK+]*)\\)/);return{value:l,count:s?s[1]:null}}}}return null}function Ce(){var e=G(\"og:description\");if(!e)return null;var r=e.match(/\\bat\\s+(.+?)\\s+in\\s+([^.]+)\\./i);if(r)return{streetAddress:r[1].trim(),addressLocality:r[2].trim()};return null}function Me(){var e=Se();return{name:Ae(),servesCuisine:e.cuisines,priceRange:e.priceTier,address:Ce(),hasMenu:x}}function Te(){var e=null,r=null,n=null;if(f.aggregateRating){e=pe(f.aggregateRating.ratingValue);var t=we();r=t.ratings;n=t.reviews}if(e===null||!r){var a=be();if(a){if(e===null)e=a.value;if(!r)r=a.count}}if(e===null)return null;return{value:e,ratings_count_display:r,reviews_count_display:n}}if(!f){if(x){f=Me()}else{alert(\"Could not read restaurant data from this page.\\n\\nDoorDash hides menu data when you are signed in. Please sign out of DoorDash (or open this page in an incognito / private window) and click the bookmarklet again.\");return}}var _e=G(\"og:image\");var B=null;var k=null;var z=document.querySelector('[data-testid=\"HeroImageContainer\"]');if(z){var Q=z.querySelectorAll(\"img\");for(var N=0;N<Q.length;N++){var L=Q[N];if(L.closest('[data-testid=\"HeroPrimaryImage\"]')){if(!k)k=L.src}else{if(!B)B=L.src}}}var T={};var X=document.querySelectorAll('[data-testid=\"image-action-card-container\"] img');for(var U=0;U<X.length;U++){var W=X[U];var J=W.alt&&W.alt.trim();var Z=W.src;if(J&&Z&&!T[J])T[J]=Z}var K=f.address||{};var ee=[d(K.streetAddress),d(K.addressLocality),d(K.addressRegion)].filter(function(e){return e});var Ie=ee.length>0?ee.join(\", \"):null;function we(){var e=document.querySelectorAll(\"span\");for(var r=0;r<e.length;r++){var n=e[r];if(n.children.length>0)continue;var t=(n.textContent||\"\").trim();var a=t.match(/^(\\S+)\\s+ratings?\\s*[\\u2022\\u00b7]\\s*(\\S+)\\s+public\\s+reviews?$/i);if(a)return{ratings:a[1],reviews:a[2]};var u=t.match(/^(\\S+)\\s+ratings?$/i);if(u)return{ratings:u[1],reviews:null}}return{ratings:null,reviews:null}}var xe=Te();var O=[];if(Array.isArray(f.image))O=f.image;else if(typeof f.image===\"string\")O=[f.image];var re=k||_e||d(O[0]);var $e=k||d(O[0])||re;var ne=f.hasMenu&&typeof f.hasMenu===\"object\"?f.hasMenu:x;function te(e,r){if(typeof e!==\"string\")return e;if(e.length<=r)return e;return e.slice(0,r-1).replace(/\\s+\\S*$/,\"\")+\"\\u2026\"}var S=[];function ae(e){if(!e)return null;var r=Array.isArray(e)?e:[e];for(var n=0;n<r.length;n++){var t=r[n];if(t&&t.price){return typeof t.price===\"string\"?t.price:\"$\"+t.price}}return null}function ie(e){if(!e)return null;if(typeof e.image===\"string\")return e.image;if(Array.isArray(e.image)&&typeof e.image[0]===\"string\")return e.image[0];return null}function ke(e){if(S.length>=10)return;if(!e||!d(e.name))return;var r=b(d(e.name));var n=ie(e);if(!n&&r){if(T[r])n=T[r];else if(T[e.name])n=T[e.name]}S.push({name:r,description:te(b(d(e.description)),240),price:d(ae(e.offers)),image_url:n})}function ue(e){if(!e||S.length>=10)return;if(Array.isArray(e)){for(var r=0;r<e.length&&S.length<10;r++)ue(e[r]);return}var n=e.hasMenuItem;if(!n)return;var t=Array.isArray(n)?n:[n];for(var a=0;a<t.length&&S.length<10;a++)ke(t[a])}function Oe(){var e={};for(var r=0;r<w.length;r++){try{var n=JSON.parse(w[r].textContent||\"\");var t=Array.isArray(n)?n:[n];var a=t.slice();while(a.length){var u=a.pop();if(!u||typeof u!==\"object\")continue;if(Array.isArray(u)){for(var l=0;l<u.length;l++)a.push(u[l]);continue}if(u.hasMenuItem){var c=Array.isArray(u.hasMenuItem)?u.hasMenuItem:[u.hasMenuItem];for(var h=0;h<c.length;h++){var s=c[h];if(s&&typeof s===\"object\"&&typeof s.name===\"string\"&&!e[s.name]){e[s.name]=s}}}if(u.hasMenuSection)a.push(u.hasMenuSection);if(u.hasMenu)a.push(u.hasMenu)}}catch(m){}}return e}function qe(e,r){if(e[r])return e[r];for(var n in e){if(Object.prototype.hasOwnProperty.call(e,n)&&b(n)===r)return e[n]}return null}function Re(){var e=document.querySelectorAll(\"h1,h2,h3,h4\");var r=null;for(var n=0;n<e.length;n++){if(/^featured\\s+items$/i.test((e[n].textContent||\"\").trim())&&e[n].offsetParent!==null){r=e[n];break}}if(!r)return null;var t=r;for(var a=0;a<8;a++){t=t.parentElement;if(!t)return null;if(t.querySelectorAll('[data-testid=\"image-action-card-container\"]').length>0)return t}return null}function Fe(e,r){var n=Re();if(!n)return r([]);var t={};var a=[];var u=0;var l=0;function c(){var o=n.querySelectorAll('[data-testid=\"image-action-card-container\"]');for(var i=0;i<o.length;i++){var g=o[i];var v=g.querySelector(\"img\");var A=v&&v.alt?v.alt.trim():\"\";if(!A||!v||!v.src)continue;if(t[A])continue;var _=(g.innerText||\"\").split(\"\\n\").map(function(q){return q.trim()}).filter(Boolean);var C=null;for(var p=0;p<_.length;p++){if(/^\\$\\d/.test(_[p])){C=_[p];break}}var y=qe(e,A);t[A]={name:b(A),description:y?te(b(d(y.description)),240):null,price:C||(y?ae(y.offers):null),image_url:v.src||(y?ie(y):null)};a.push(A)}}function h(){var o=n.querySelectorAll(\"button\");for(var i=0;i<o.length;i++){var g=o[i];var v=(g.getAttribute(\"aria-label\")||\"\").toLowerCase();if(v.indexOf(\"next\")>=0&&!g.disabled&&g.getAttribute(\"aria-disabled\")!==\"true\")return g}return null}function s(){var o=[];for(var i=0;i<a.length&&i<10;i++)o.push(t[a[i]]);r(o)}function m(){var o=a.length;c();if(a.length===o)l++;else l=0;if(a.length>=10||l>=2||u>=15)return s();var i=h();if(!i)return s();i.click();u++;setTimeout(m,500)}m()}var Pe=Oe();var De=b(d(f.name))||b(d(document.title))||\"Unknown\";var oe=location.origin+location.pathname;var le={version:1,source:\"doordash\",source_url:oe,fetched_at:new Date().toISOString(),cuisines:ye(f.servesCuisine),price_range:d(f.priceRange),rating:xe,avatar_image_url:B,cover_image_url:re,hero_image_url:$e,address:Ie,menu_items:S,hours:null};var Ee={name:De,doordash_url:oe,rich_content:le};var He={Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7};function se(e){if(!e)return null;var r=e.replace(/\\s+/g,\" \").trim().match(/^(\\d{1,2})(?::(\\d{2}))?\\s*(AM|PM)$/i);if(!r)return null;var n=parseInt(r[1],10);var t=r[2]?parseInt(r[2],10):0;var a=r[3].toUpperCase();if(a===\"PM\"&&n<12)n+=12;else if(a===\"AM\"&&n===12)n=0;return(n<10?\"0\"+n:\"\"+n)+\":\"+(t<10?\"0\"+t:\"\"+t)}function Be(e){var r=null;var n=document.querySelectorAll(\"button,a\");for(var t=0;t<n.length;t++){var a=n[t];if(a.offsetParent===null)continue;if(/see\\s*more/i.test((a.textContent||\"\").trim())){r=a;break}}if(!r)return e(null);r.click();var u=0;(function l(){var c=document.querySelector(\"[role=dialog]\");if(!c){if(u++>40)return e(null);return setTimeout(l,100)}function h(){var o=c.querySelectorAll(\"button,[role=button]\");for(var i=0;i<o.length;i++){var g=(o[i].textContent||\"\").trim();if(o[i].getAttribute(\"aria-label\"))continue;if(/^close$/i.test(g))continue;if(/(closed|open\\s*now|accepting\\s+doordash\\s+orders)/i.test(g)){return o[i]}}return null}function s(){var o=c.querySelectorAll(\"button\");for(var i=0;i<o.length;i++){var g=o[i].getAttribute(\"aria-label\")||\"\";if(/^close\\s/i.test(g)){o[i].click();return}}for(var v=0;v<o.length;v++){if(/^close$/i.test((o[v].textContent||\"\").trim())){o[v].click();return}}}var m=0;(function o(){var i=h();if(!i){if(m++>40){s();return e(null)}return setTimeout(o,100)}i.click();var g=0;(function v(){var A=c.innerText||\"\";if(!/\\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\\b/.test(A)){if(g++>30){s();return e(null)}return setTimeout(v,100)}var _=A.split(\"\\n\").map(function(Le){return Le.trim()}).filter(Boolean);var C={};var p=null;for(var y=0;y<_.length;y++){var q=_[y];var fe=q.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:\\s*\\(Today\\))?$/);if(fe){p=He[fe[1]];if(!C[p])C[p]=[];continue}var V=q.match(/^(\\d{1,2}(?::\\d{2})?\\s*(?:AM|PM))\\s*[-\\u2013\\u2014]\\s*(\\d{1,2}(?::\\d{2})?\\s*(?:AM|PM))$/i);if(V&&p){var ce=se(V[1]);var ve=se(V[2]);if(ce&&ve)C[p].push({opens_at:ce,closes_at:ve})}}var R=[];for(var F=1;F<=7;F++)R.push({day_of_week:F,ranges:C[F]||[]});s();var ge=false;for(var Y=0;Y<R.length;Y++)if(R[Y].ranges.length>0){ge=true;break}e(ge?R:null)})()})()})()}function Ne(e){le.hours=e;var r=JSON.stringify(Ee);var n;try{n=btoa(unescape(encodeURIComponent(r)))}catch(t){alert(\"Could not encode the restaurant data. This is a bug.\");return}if(n.length>2e4){alert(\"Too much data to prefill this page. Add this restaurant manually instead.\");return}window.open(\"${REVIA_ORIGIN}/admin/restaurants/new?prefill=\"+encodeURIComponent(n),\"_blank\")}Fe(Pe,function(e){if(e&&e.length>0){for(var r=0;r<e.length&&S.length<10;r++){S.push(e[r])}}else if(ne){ue(ne.hasMenuSection)}Be(Ne)})})();"
