/* Upgrades the hand-authored .recs-section on every destination page into a
   searchable, filterable list — without touching the content markup.

   The 7 hand-written pages and pages/country.html all emit the same shape:
     .recs-grid > .recs-card.is-{food,info,stay}
                    > .rec-source.rec-source--{neta,roni}
                    > h3
                    > ul > li > <b>Place</b> — text
   so category and source can both be read straight off the existing classes.
   Filtering happens at the <li> level (not the card level) so a search for
   "קפה" leaves the matching tips visible inside otherwise-unrelated cards. */
(function () {
    'use strict';

    var CATEGORIES = [
        { key: 'all', label: 'הכל', icon: '✨' },
        { key: 'info', label: 'חופים ואטרקציות', icon: '🏖️' },
        { key: 'food', label: 'אוכל וקפה', icon: '🍝' },
        { key: 'stay', label: 'לינה ווולנס', icon: '🧘' }
    ];

    var state = { cat: 'all', source: 'all', q: '' };

    function norm(s) {
        return (s || '').toLowerCase().replace(/[״"'׳`]/g, '').trim();
    }

    /* Latin-script bold runs are place names; a bold run containing Hebrew
       *letters* is emphasis ("לפחות 4–5 ימים"), not somewhere you can navigate
       to. Hebrew punctuation is allowed through on purpose — geresh and
       gershayim get typed as apostrophes inside Latin names ("Let׳s Bake"). */
    function isPlaceName(text) {
        var t = (text || '').trim();
        if (t.length < 3 || t.length > 60) return false;
        if (/[א-ת]/.test(t)) return false;
        return /[A-Za-z]{3}/.test(t);
    }

    /* `area` is the destination in ENGLISH (destSearchArea() in js/main.js).
       It used to be the Hebrew page title, which made every search a mix of a
       Latin place name and a Hebrew town — Google Maps found nothing for most
       of them. */
    function linkifyPlaces(section, area) {
        section.querySelectorAll('.recs-card li b').forEach(function (b) {
            if (b.closest('a')) return;
            if (b.dataset.mapLinked) return;
            var name = b.textContent.trim();
            if (!isPlaceName(name)) return;

            var a = document.createElement('a');
            a.className = 'rec-map-link';
            a.href = 'https://www.google.com/maps/search/?api=1&query=' +
                encodeURIComponent(name + (area ? ' ' + area : ''));
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.title = 'פתיחה ב-Google Maps: ' + name;

            b.dataset.mapLinked = '1';
            b.parentNode.insertBefore(a, b);
            a.appendChild(b);
            var pin = document.createElement('span');
            pin.className = 'rec-map-link__pin';
            pin.setAttribute('aria-hidden', 'true');
            pin.textContent = '📍';
            a.appendChild(pin);
        });
    }

    function cardCategory(card) {
        if (card.classList.contains('is-food')) return 'food';
        if (card.classList.contains('is-stay')) return 'stay';
        return 'info';
    }

    function cardSource(card) {
        var badge = card.querySelector('.rec-source');
        if (!badge) return '';
        var hit = '';
        badge.classList.forEach(function (c) {
            var m = /^rec-source--(.+)$/.exec(c);
            if (m) hit = m[1];
        });
        return hit;
    }

    function collectSources(cards) {
        var seen = {};
        var out = [];
        cards.forEach(function (card) {
            var key = cardSource(card);
            if (!key || seen[key]) return;
            seen[key] = true;
            var badge = card.querySelector('.rec-source');
            out.push({ key: key, label: badge ? badge.textContent.trim() : key });
        });
        return out;
    }

    function buildToolbar(section, cards) {
        var sources = collectSources(cards);
        var bar = document.createElement('div');
        bar.className = 'recs-toolbar';

        var search = document.createElement('div');
        search.className = 'recs-search';
        search.innerHTML =
            '<span class="recs-search__icon" aria-hidden="true">🔍</span>' +
            '<input type="search" class="recs-search__input" id="recsSearch" ' +
            'placeholder="חיפוש בהמלצות — מקום, מנה, אווירה…" aria-label="חיפוש בהמלצות" autocomplete="off">' +
            '<button type="button" class="recs-search__clear" id="recsSearchClear" aria-label="ניקוי חיפוש" hidden>✕</button>';

        var chips = document.createElement('div');
        chips.className = 'recs-chips';
        chips.setAttribute('role', 'group');
        chips.setAttribute('aria-label', 'סינון לפי נושא');
        CATEGORIES.forEach(function (c) {
            var present = c.key === 'all' || cards.some(function (card) { return cardCategory(card) === c.key; });
            if (!present) return;
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'recs-chip' + (c.key === state.cat ? ' is-active' : '');
            b.dataset.cat = c.key;
            b.setAttribute('aria-pressed', String(c.key === state.cat));
            b.innerHTML = '<span aria-hidden="true">' + c.icon + '</span> ' + c.label;
            chips.appendChild(b);
        });

        bar.appendChild(search);
        bar.appendChild(chips);

        /* Only worth offering when more than one friend contributed tips. */
        if (sources.length > 1) {
            var srcWrap = document.createElement('div');
            srcWrap.className = 'recs-chips recs-chips--source';
            srcWrap.setAttribute('role', 'group');
            srcWrap.setAttribute('aria-label', 'סינון לפי ממליץ');
            var all = document.createElement('button');
            all.type = 'button';
            all.className = 'recs-chip recs-chip--src is-active';
            all.dataset.source = 'all';
            all.setAttribute('aria-pressed', 'true');
            all.textContent = 'כל הממליצים';
            srcWrap.appendChild(all);
            sources.forEach(function (s) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'recs-chip recs-chip--src rec-source--' + s.key;
                b.dataset.source = s.key;
                b.setAttribute('aria-pressed', 'false');
                b.textContent = s.label;
                srcWrap.appendChild(b);
            });
            bar.appendChild(srcWrap);
        }

        var empty = document.createElement('p');
        empty.className = 'recs-empty';
        empty.id = 'recsEmpty';
        empty.hidden = true;
        empty.textContent = 'לא נמצאו המלצות מתאימות — נסו מילה אחרת או בחרו "הכל".';

        var count = document.createElement('p');
        count.className = 'recs-count';
        count.id = 'recsCount';
        count.hidden = true;

        var grid = section.querySelector('.recs-grid');
        section.insertBefore(bar, grid);
        section.insertBefore(count, grid);
        section.appendChild(empty);
        return bar;
    }

    function apply(section, cards) {
        var q = norm(state.q);
        var shown = 0;

        cards.forEach(function (card) {
            var catOk = state.cat === 'all' || cardCategory(card) === state.cat;
            var srcOk = state.source === 'all' || cardSource(card) === state.source;
            var items = [].slice.call(card.querySelectorAll('li'));
            var visibleItems = 0;

            items.forEach(function (li) {
                var textOk = !q || norm(li.textContent).indexOf(q) !== -1;
                /* A card whose heading matches ("קפה ובוקר") keeps all its tips —
                   otherwise searching a category name returns nothing. */
                var headEl = card.querySelector('h3');
                var headOk = !!q && headEl && norm(headEl.textContent).indexOf(q) !== -1;
                var show = catOk && srcOk && (textOk || headOk);
                li.hidden = !show;
                if (show) visibleItems++;
            });

            card.hidden = visibleItems === 0;
            if (visibleItems) shown += visibleItems;
        });

        var empty = document.getElementById('recsEmpty');
        if (empty) empty.hidden = shown !== 0;

        var count = document.getElementById('recsCount');
        if (count) {
            var filtering = !!q || state.cat !== 'all' || state.source !== 'all';
            count.hidden = !filtering || shown === 0;
            count.textContent = shown === 1 ? 'המלצה אחת' : shown + ' המלצות';
        }
    }

    function initRecsSection() {
        var section = document.querySelector('.recs-section');
        if (!section || section.dataset.enhanced) return;
        var grid = section.querySelector('.recs-grid');
        if (!grid) return;
        var cards = [].slice.call(grid.querySelectorAll('.recs-card'));
        if (!cards.length) return;
        section.dataset.enhanced = '1';

        var area = typeof destSearchArea === 'function'
            ? destSearchArea(typeof currentCountryId === 'function' ? currentCountryId() : '')
            : '';
        linkifyPlaces(section, area);

        /* One card and a handful of tips doesn't need a filter bar. */
        var tipCount = grid.querySelectorAll('.recs-card li').length;
        if (cards.length < 2 && tipCount < 6) return;

        var bar = buildToolbar(section, cards);

        var input = document.getElementById('recsSearch');
        var clear = document.getElementById('recsSearchClear');
        if (input) {
            input.addEventListener('input', function () {
                state.q = input.value;
                if (clear) clear.hidden = !input.value;
                apply(section, cards);
            });
        }
        if (clear) {
            clear.addEventListener('click', function () {
                state.q = '';
                if (input) { input.value = ''; input.focus(); }
                clear.hidden = true;
                apply(section, cards);
            });
        }

        bar.addEventListener('click', function (e) {
            var chip = e.target.closest('.recs-chip');
            if (!chip) return;
            var isSource = chip.classList.contains('recs-chip--src');
            var scope = chip.parentNode;
            if (isSource) state.source = chip.dataset.source;
            else state.cat = chip.dataset.cat;
            scope.querySelectorAll('.recs-chip').forEach(function (c) {
                var on = c === chip;
                c.classList.toggle('is-active', on);
                c.setAttribute('aria-pressed', String(on));
            });
            apply(section, cards);
        });

        apply(section, cards);
    }

    document.addEventListener('DOMContentLoaded', initRecsSection);
    /* pages/country.html renders its recs after fetching the catalog. */
    document.addEventListener('recsrendered', function () {
        var s = document.querySelector('.recs-section');
        if (s) delete s.dataset.enhanced;
        initRecsSection();
    });

    window.initRecsSection = initRecsSection;
})();
