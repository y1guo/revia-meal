// The DoorDash import bookmarklet. Runs in the admin's browser on a DoorDash restaurant
// page, extracts JSON-LD + Open Graph data, and opens the revia-meal import-review page
// with a base64-encoded payload in the URL.
//
// See docs/requirements/doordash-import.md for the overall design and
// lib/rich-content.ts for the payload shape the server side expects.
//
// The placeholder literal '${REVIA_ORIGIN}' (occurs exactly once) is substituted at
// install time by the install card in app/admin/restaurants/bookmarklet-install.tsx,
// using `.replace('${REVIA_ORIGIN}', window.location.origin)`. That lets the same source
// produce a dev bookmarklet and a prod bookmarklet depending on where the admin drags it
// from.
//
// The MINIFIED single-line export below is what actually runs. The `/* EXPANDED */`
// comment right above it is the source-of-truth — any edit should be applied there
// first, then hand-re-minified.
//
// Minification rules (so the anchor's href survives the trip intact):
//   - Single quotes only for string literals.
//   - No newlines; single spaces only.
//   - Explicit `;` between statements (no ASI reliance).
//   - No `//` line comments (a stray newline would start-comment the rest of the URL).
//   - Strings containing special chars (#, ?, %) must stay inside single quotes — the
//     browser treats them as JS source, not URL fragments, once it sees `javascript:`.

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
    // We deliberately refuse partial imports. DoorDash strips JSON-LD from
    // pages you view while signed in, so OG-only fallbacks would silently
    // produce ballot rows with no menu / cuisines / rating / price — the exact
    // fields that make rich content worth having. Force the admin to sign out
    // (or use incognito / a private window) so we get the full SEO payload.
    if (!restaurant) {
        alert(
            'Could not read restaurant data from this page.\n\n' +
            'DoorDash hides menu data when you are signed in. ' +
            'Please sign out of DoorDash (or open this page in an incognito / private window) and click the bookmarklet again.'
        );
        return;
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
    var ogImage = getMeta('og:image');

    // DoorDash serves text with HTML entities (&amp;, &#39;, etc.) in JSON-LD. Decode
    // them by rendering through a throwaway element and reading textContent — safe
    // because we only read, never re-innerHTML.
    function decodeEntities(s) {
        if (typeof s !== 'string' || s.indexOf('&') < 0) return s;
        var div = document.createElement('div');
        div.innerHTML = s;
        return div.textContent || s;
    }

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
    var rating = null;
    if (restaurant.aggregateRating) {
        var rv = num(restaurant.aggregateRating.ratingValue);
        if (rv !== null) {
            var counts = scrapeRatingCounts();
            rating = {
                value: rv,
                ratings_count_display: counts.ratings,
                reviews_count_display: counts.reviews,
            };
        }
    }
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

export const BOOKMARKLET_SOURCE =
    "(function(){if(!/(?:^|\\.)doordash\\.com$/i.test(location.hostname)){alert('This bookmarklet only works on DoorDash restaurant pages.');return;}var FOOD_TYPES=['Restaurant','FoodEstablishment','FastFoodRestaurant','CafeOrCoffeeShop','Bakery','BarOrPub','IceCreamShop'];function isFoodType(types){for(var ti=0;ti<types.length;ti++){if(FOOD_TYPES.indexOf(types[ti])>=0)return true;}return false;}var ldBlocks=document.querySelectorAll('script[type=\"application/ld+json\"]');var restaurant=null;var menuBlock=null;var seenTypes=[];for(var i=0;i<ldBlocks.length;i++){try{var d=JSON.parse(ldBlocks[i].textContent||'');var arr=Array.isArray(d)?d:[d];for(var j=0;j<arr.length;j++){var obj=arr[j];var t=obj['@type'];var types=Array.isArray(t)?t:[t];for(var ki=0;ki<types.length;ki++){if(types[ki])seenTypes.push(String(types[ki]));}if(!restaurant&&isFoodType(types))restaurant=obj;else if(!restaurant&&(obj.hasMenu||obj.servesCuisine))restaurant=obj;if(types.indexOf('Menu')>=0)menuBlock=obj;}}catch(_){}}if(!restaurant){alert('Could not read restaurant data from this page.\\n\\nDoorDash hides menu data when you are signed in. Please sign out of DoorDash (or open this page in an incognito / private window) and click the bookmarklet again.');return;}function getMeta(p){var el=document.querySelector('meta[property=\"'+p+'\"]');return el?(el.getAttribute('content')||null):null;}function str(v){return typeof v==='string'&&v.length>0?v:null;}function num(v){var n=typeof v==='number'?v:parseFloat(v);return isFinite(n)?n:null;}function normCuisines(v){if(Array.isArray(v)){return v.filter(function(c){return typeof c==='string'&&c;});}if(typeof v==='string'&&v)return [v];return [];}function decodeEntities(s){if(typeof s!=='string'||s.indexOf('&')<0)return s;var div=document.createElement('div');div.innerHTML=s;return div.textContent||s;}var ogImage=getMeta('og:image');var avatarImage=null;var coverImageDom=null;var heroContainer=document.querySelector('[data-testid=\"HeroImageContainer\"]');if(heroContainer){var heroImgs=heroContainer.querySelectorAll('img');for(var hi=0;hi<heroImgs.length;hi++){var himg=heroImgs[hi];if(himg.closest('[data-testid=\"HeroPrimaryImage\"]')){if(!coverImageDom)coverImageDom=himg.src;}else{if(!avatarImage)avatarImage=himg.src;}}}var itemImageMap={};var itemCards=document.querySelectorAll('[data-testid=\"image-action-card-container\"] img');for(var ii=0;ii<itemCards.length;ii++){var cardImg=itemCards[ii];var alt=cardImg.alt&&cardImg.alt.trim();var src=cardImg.src;if(alt&&src&&!itemImageMap[alt])itemImageMap[alt]=src;}var addrObj=restaurant.address||{};var addrParts=[str(addrObj.streetAddress),str(addrObj.addressLocality),str(addrObj.addressRegion)].filter(function(p){return p;});var address=addrParts.length>0?addrParts.join(', '):null;function scrapeRatingCounts(){var spans=document.querySelectorAll('span');for(var si=0;si<spans.length;si++){var sp=spans[si];if(sp.children.length>0)continue;var txt=(sp.textContent||'').trim();var both=txt.match(/^(\\S+)\\s+ratings?\\s*[\\u2022\\u00b7]\\s*(\\S+)\\s+public\\s+reviews?$/i);if(both)return {ratings:both[1],reviews:both[2]};var rOnly=txt.match(/^(\\S+)\\s+ratings?$/i);if(rOnly)return {ratings:rOnly[1],reviews:null};}return {ratings:null,reviews:null};}var rating=null;if(restaurant.aggregateRating){var rv=num(restaurant.aggregateRating.ratingValue);if(rv!==null){var counts=scrapeRatingCounts();rating={value:rv,ratings_count_display:counts.ratings,reviews_count_display:counts.reviews};}}var images=[];if(Array.isArray(restaurant.image))images=restaurant.image;else if(typeof restaurant.image==='string')images=[restaurant.image];var coverImage=coverImageDom||ogImage||str(images[0]);var heroImage=coverImageDom||str(images[0])||coverImage;var menuRoot=(restaurant.hasMenu&&typeof restaurant.hasMenu==='object')?restaurant.hasMenu:menuBlock;function trimLong(s,n){if(typeof s!=='string')return s;if(s.length<=n)return s;return s.slice(0,n-1).replace(/\\s+\\S*$/,'')+'\\u2026';}var menuItems=[];function offerPrice(offers){if(!offers)return null;var arr=Array.isArray(offers)?offers:[offers];for(var op=0;op<arr.length;op++){var off=arr[op];if(off&&off.price){return typeof off.price==='string'?off.price:('$'+off.price);}}return null;}function ldImage(it){if(!it)return null;if(typeof it.image==='string')return it.image;if(Array.isArray(it.image)&&typeof it.image[0]==='string')return it.image[0];return null;}function pushItem(it){if(menuItems.length>=10)return;if(!it||!str(it.name))return;var itName=decodeEntities(str(it.name));var itImage=ldImage(it);if(!itImage&&itName){if(itemImageMap[itName])itImage=itemImageMap[itName];else if(itemImageMap[it.name])itImage=itemImageMap[it.name];}menuItems.push({name:itName,description:trimLong(decodeEntities(str(it.description)),240),price:str(offerPrice(it.offers)),image_url:itImage});}function walkSections(val){if(!val||menuItems.length>=10)return;if(Array.isArray(val)){for(var x=0;x<val.length&&menuItems.length<10;x++)walkSections(val[x]);return;}var items=val.hasMenuItem;if(!items)return;var itemArr=Array.isArray(items)?items:[items];for(var y=0;y<itemArr.length&&menuItems.length<10;y++)pushItem(itemArr[y]);}function buildLdItemIndex(){var index={};for(var bi=0;bi<ldBlocks.length;bi++){try{var d=JSON.parse(ldBlocks[bi].textContent||'');var arr=Array.isArray(d)?d:[d];var stack=arr.slice();while(stack.length){var v=stack.pop();if(!v||typeof v!=='object')continue;if(Array.isArray(v)){for(var vi=0;vi<v.length;vi++)stack.push(v[vi]);continue;}if(v.hasMenuItem){var mi=Array.isArray(v.hasMenuItem)?v.hasMenuItem:[v.hasMenuItem];for(var mii=0;mii<mi.length;mii++){var it2=mi[mii];if(it2&&typeof it2==='object'&&typeof it2.name==='string'&&!index[it2.name]){index[it2.name]=it2;}}}if(v.hasMenuSection)stack.push(v.hasMenuSection);if(v.hasMenu)stack.push(v.hasMenu);}}catch(_){}}return index;}function findLdMatch(index,name){if(index[name])return index[name];for(var k in index){if(Object.prototype.hasOwnProperty.call(index,k)&&decodeEntities(k)===name)return index[k];}return null;}function findFeaturedContainer(){var hs=document.querySelectorAll('h1,h2,h3,h4');var featured=null;for(var i=0;i<hs.length;i++){if(/^featured\\s+items$/i.test((hs[i].textContent||'').trim())&&hs[i].offsetParent!==null){featured=hs[i];break;}}if(!featured)return null;var cur=featured;for(var h=0;h<8;h++){cur=cur.parentElement;if(!cur)return null;if(cur.querySelectorAll('[data-testid=\"image-action-card-container\"]').length>0)return cur;}return null;}function scrapeFeaturedItems(ldIndex,cb){var container=findFeaturedContainer();if(!container)return cb([]);var collected={};var order=[];var clicks=0;var stagnant=0;function collect(){var cards=container.querySelectorAll('[data-testid=\"image-action-card-container\"]');for(var c=0;c<cards.length;c++){var card=cards[c];var img=card.querySelector('img');var alt=img&&img.alt?img.alt.trim():'';if(!alt||!img||!img.src)continue;if(collected[alt])continue;var cl=(card.innerText||'').split(String.fromCharCode(10)).map(function(l){return l.trim();}).filter(Boolean);var priceLine=null;for(var li=0;li<cl.length;li++){if(/^\\$\\d/.test(cl[li])){priceLine=cl[li];break;}}var ldMatch=findLdMatch(ldIndex,alt);collected[alt]={name:decodeEntities(alt),description:ldMatch?trimLong(decodeEntities(str(ldMatch.description)),240):null,price:priceLine||(ldMatch?offerPrice(ldMatch.offers):null),image_url:img.src||(ldMatch?ldImage(ldMatch):null)};order.push(alt);}}function findNext(){var buttons=container.querySelectorAll('button');for(var b=0;b<buttons.length;b++){var btn=buttons[b];var lbl=(btn.getAttribute('aria-label')||'').toLowerCase();if(lbl.indexOf('next')>=0&&!btn.disabled&&btn.getAttribute('aria-disabled')!=='true')return btn;}return null;}function finishWalk(){var out=[];for(var i=0;i<order.length&&i<10;i++)out.push(collected[order[i]]);cb(out);}function step(){var prev=order.length;collect();if(order.length===prev)stagnant++;else stagnant=0;if(order.length>=10||stagnant>=2||clicks>=15)return finishWalk();var nxt=findNext();if(!nxt)return finishWalk();nxt.click();clicks++;setTimeout(step,500);}step();}var ldIndex=buildLdItemIndex();var name=decodeEntities(str(restaurant.name))||decodeEntities(str(document.title))||'Unknown';var sourceUrl=location.origin+location.pathname;var richContent={version:1,source:'doordash',source_url:sourceUrl,fetched_at:new Date().toISOString(),cuisines:normCuisines(restaurant.servesCuisine),price_range:str(restaurant.priceRange),rating:rating,avatar_image_url:avatarImage,cover_image_url:coverImage,hero_image_url:heroImage,address:address,menu_items:menuItems,hours:null};var payload={name:name,doordash_url:sourceUrl,rich_content:richContent};var DAY_MAP={Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7};function toHHMM(s){if(!s)return null;var m=s.replace(/\\s+/g,' ').trim().match(/^(\\d{1,2})(?::(\\d{2}))?\\s*(AM|PM)$/i);if(!m)return null;var h=parseInt(m[1],10);var mn=m[2]?parseInt(m[2],10):0;var ampm=m[3].toUpperCase();if(ampm==='PM'&&h<12)h+=12;else if(ampm==='AM'&&h===12)h=0;return (h<10?'0'+h:''+h)+':'+(mn<10?'0'+mn:''+mn);}function scrapeHours(cb){var seeMore=null;var ab=document.querySelectorAll('button,a');for(var sm=0;sm<ab.length;sm++){var cand=ab[sm];if(cand.offsetParent===null)continue;if(/see\\s*more/i.test((cand.textContent||'').trim())){seeMore=cand;break;}}if(!seeMore)return cb(null);seeMore.click();var dialogTries=0;(function waitDialog(){var dialog=document.querySelector('[role=dialog]');if(!dialog){if(dialogTries++>40)return cb(null);return setTimeout(waitDialog,100);}function findOpener(){var ob=dialog.querySelectorAll('button,[role=button]');for(var oi=0;oi<ob.length;oi++){var otxt=(ob[oi].textContent||'').trim();if(ob[oi].getAttribute('aria-label'))continue;if(/^close$/i.test(otxt))continue;if(/(closed|open\\s*now|accepting\\s+doordash\\s+orders)/i.test(otxt))return ob[oi];}return null;}function closeDialog(){var bts=dialog.querySelectorAll('button');for(var ci=0;ci<bts.length;ci++){var aria=bts[ci].getAttribute('aria-label')||'';if(/^close\\s/i.test(aria)){bts[ci].click();return;}}for(var ci2=0;ci2<bts.length;ci2++){if(/^close$/i.test((bts[ci2].textContent||'').trim())){bts[ci2].click();return;}}}var openerTries=0;(function waitOpener(){var opener=findOpener();if(!opener){if(openerTries++>40){closeDialog();return cb(null);}return setTimeout(waitOpener,100);}opener.click();var parseTries=0;(function waitParse(){var text=dialog.innerText||'';if(!/\\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\\b/.test(text)){if(parseTries++>30){closeDialog();return cb(null);}return setTimeout(waitParse,100);}var NL=String.fromCharCode(10);var lines=text.split(NL).map(function(l){return l.trim();}).filter(Boolean);var byDay={};var currentDow=null;for(var li=0;li<lines.length;li++){var line=lines[li];var dm=line.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:\\s*\\(Today\\))?$/);if(dm){currentDow=DAY_MAP[dm[1]];if(!byDay[currentDow])byDay[currentDow]=[];continue;}var rm=line.match(/^(\\d{1,2}(?::\\d{2})?\\s*(?:AM|PM))\\s*[-\\u2013\\u2014]\\s*(\\d{1,2}(?::\\d{2})?\\s*(?:AM|PM))$/i);if(rm&&currentDow){var opens=toHHMM(rm[1]);var closes=toHHMM(rm[2]);if(opens&&closes)byDay[currentDow].push({opens_at:opens,closes_at:closes});}}var out=[];for(var d=1;d<=7;d++)out.push({day_of_week:d,ranges:byDay[d]||[]});closeDialog();var anyRange=false;for(var oo=0;oo<out.length;oo++)if(out[oo].ranges.length>0){anyRange=true;break;}cb(anyRange?out:null);})();})();})();}function finish(hoursValue){richContent.hours=hoursValue;var json=JSON.stringify(payload);var encoded;try{encoded=btoa(unescape(encodeURIComponent(json)));}catch(e){alert('Could not encode the restaurant data. This is a bug.');return;}if(encoded.length>20000){alert('Too much data to prefill this page. Add this restaurant manually instead.');return;}window.open('${REVIA_ORIGIN}/admin/restaurants/new?prefill='+encodeURIComponent(encoded),'_blank');}scrapeFeaturedItems(ldIndex,function(featuredItems){if(featuredItems&&featuredItems.length>0){for(var fi=0;fi<featuredItems.length&&menuItems.length<10;fi++)menuItems.push(featuredItems[fi]);}else if(menuRoot){walkSections(menuRoot.hasMenuSection);}scrapeHours(finish);});})();"
