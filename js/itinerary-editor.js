(function () {
    'use strict';

    var TRIP_START = '2026-07-19';
    var TRIP_TOTAL_NIGHTS = 26;
    var LS_KEY = 'itinerary_override';
    var editModeOn = false;

    /* Ideas already written up on pages/more-destinations.html — full data
       (incl. map position + recommendations) lives in js/destination-catalog.js,
       shared with map.js and pages/country.html. Picking one here pre-fills
       name + a sensible default night count, and shows a preview (title+lead)
       so the user knows what they're adding. */
    var CANDIDATE_DESTINATIONS = (typeof DESTINATION_CATALOG !== 'undefined') ? DESTINATION_CATALOG : [];

    function esc(s) {
        if (s == null) return '';
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    /* ---- pure data helpers ---- */

    function countryNights(country) {
        return country.weeks.reduce(function (sum, w) { return sum + w.days.length; }, 0);
    }

    function totalNights() {
        return (tripData.countries || []).reduce(function (sum, c) { return sum + countryNights(c); }, 0);
    }

    function setCountryNights(country, newNights) {
        newNights = Math.max(1, parseInt(newNights, 10) || 1);
        var diff = newNights - countryNights(country);
        if (diff === 0) return;
        if (!country.weeks.length) country.weeks.push({ weekNum: 1, label: '', days: [] });
        var lastWeek = country.weeks[country.weeks.length - 1];

        if (diff > 0) {
            var maxDayNum = 0;
            country.weeks.forEach(function (w) { w.days.forEach(function (d) { if (d.dayNum > maxDayNum) maxDayNum = d.dayNum; }); });
            for (var i = 0; i < diff; i++) {
                maxDayNum++;
                lastWeek.days.push({ dayNum: maxDayNum, date: '', label: 'יום פנוי ב' + country.name });
            }
        } else {
            var toRemove = -diff;
            for (var w = country.weeks.length - 1; w >= 0 && toRemove > 0; w--) {
                var week = country.weeks[w];
                var removeHere = Math.min(toRemove, week.days.length);
                week.days.splice(week.days.length - removeHere, removeHere);
                toRemove -= removeHere;
            }
        }
    }

    function toIsoDate(d) {
        /* Local date components, not toISOString() (UTC) — avoids shifting a
           day backward in timezones ahead of UTC, e.g. Israel. */
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function recomputeDates() {
        var cursor = new Date(TRIP_START + 'T12:00:00');
        (tripData.countries || []).forEach(function (country) {
            country.weeks.forEach(function (week) {
                week.days.forEach(function (day) {
                    day.date = toIsoDate(cursor);
                    cursor.setDate(cursor.getDate() + 1);
                });
            });
        });
    }

    function slugify(name) {
        var base = String(name || '').trim().toLowerCase()
            .replace(/[^a-z0-9֐-׿]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'dest';
        var id = base;
        var n = 2;
        var existing = (tripData.countries || []).map(function (c) { return c.id; });
        while (existing.indexOf(id) !== -1) { id = base + '-' + n; n++; }
        return id;
    }

    /* ---- persistence (localStorage always, Firestore when configured) ---- */

    function persistLocal() {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify({
                countries: tripData.countries,
                migrations: appliedMigrations
            }));
        } catch (e) {}
    }

    function saveOverride() {
        persistLocal();
        if (typeof db !== 'undefined' && db) {
            try {
                db.collection('tripConfig').doc('main').set({
                    countries: tripData.countries,
                    migrations: appliedMigrations,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(function (e) { console.warn('itinerary save', e); });
            } catch (e) {}
        }
    }

    function loadOverrideFromLocalStorage() {
        try {
            var raw = localStorage.getItem(LS_KEY);
            if (!raw) return false;
            var data = JSON.parse(raw);
            if (data && Array.isArray(data.countries) && data.countries.length) {
                tripData.countries = data.countries;
                if (Array.isArray(data.migrations)) appliedMigrations = data.migrations.slice();
                return true;
            }
        } catch (e) {}
        return false;
    }

    function subscribeOverride() {
        if (typeof db === 'undefined' || !db) return;
        try {
            db.collection('tripConfig').doc('main').onSnapshot(function (doc) {
                if (doc.exists && doc.data() && Array.isArray(doc.data().countries) && doc.data().countries.length) {
                    tripData.countries = doc.data().countries;
                    appliedMigrations = Array.isArray(doc.data().migrations) ? doc.data().migrations.slice() : [];
                    /* applyMigrations() saves (cloud included) when it changes
                       something, so only mirror to localStorage otherwise. */
                    if (!applyMigrations(true)) persistLocal();
                    notifyChange();
                } else if (hasLocalOverride) {
                    /* This browser holds an edited itinerary that never reached
                       the cloud (early versions could fail the write silently),
                       so nobody else ever saw it. Push it up once — from here on
                       the doc exists and normal last-writer-wins applies. */
                    saveOverride();
                }
            }, function (err) { console.warn('itinerary load', err); });
        } catch (e) {}
    }

    function notifyChange() {
        /* A cloud snapshot can land before the DOM exists (subscribeOverride now
           runs at load on every page). The DOMContentLoaded pass below renders
           from the already-updated tripData, so just skip the early dispatch. */
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', notifyChange, { once: true });
            return;
        }
        document.dispatchEvent(new CustomEvent('tripdatachange'));
    }

    /* ---- one-off corrections replayed onto an already-saved itinerary ---- */

    /* The plan hardcoded in js/main.js, captured BEFORE any override is loaded
       over it — the migrations below rebuild a destination straight from it,
       so the corrected labels/nights live in exactly one place. */
    var DEFAULT_COUNTRIES = JSON.parse(JSON.stringify(tripData.countries || []));
    var appliedMigrations = [];

    function indexOfId(countries, id) {
        for (var i = 0; i < countries.length; i++) {
            if (countries[i].id === id) return i;
        }
        return -1;
    }

    function defaultCountry(id) {
        var i = indexOfId(DEFAULT_COUNTRIES, id);
        return i === -1 ? null : JSON.parse(JSON.stringify(DEFAULT_COUNTRIES[i]));
    }

    /* Editing the defaults in js/main.js is not enough on its own: every
       browser that has opened the site holds an override (localStorage +
       Firestore tripConfig/main) that is loaded over them, and the editor UI
       can add/reorder/resize destinations but cannot RENAME one. So a
       correction to the plan has to be replayed onto the saved override once.
       Each entry runs at most once — the ids that already ran are stored in
       the override itself, so the fix reaches every device and never
       re-applies (which would resurrect something deleted on purpose later).
       A browser with no override at all skips all of this: it is already
       reading the corrected defaults. */
    var MIGRATIONS = [
        {
            /* "לומבוק" was really two stops: Kuta in the south, then the
               inland village Tetebatu (Shir's tip). 5 nights → 4 + 2. */
            id: '2026-07-kuta-lombok-tetebatu',
            apply: function (countries) {
                var i = indexOfId(countries, 'lombok');
                var kuta = defaultCountry('lombok');
                var tetebatu = defaultCountry('tetebatu');
                if (i === -1 || !kuta || !tetebatu) return;
                if (indexOfId(countries, 'tetebatu') !== -1) {
                    /* Tetebatu was already added by hand — rename only, and
                       leave the nights whoever did it chose. */
                    countries[i].name = kuta.name;
                    countries[i].intro = kuta.intro;
                    return;
                }
                countries.splice(i, 1, kuta, tetebatu);

                /* Gili's arrival day still described the ferry from Padangbai
                   in Bali, which stopped being true when Lombok moved ahead of
                   it. Matched on the stale text so a later hand-written label
                   is never overwritten. */
                var g = indexOfId(countries, 'gili');
                var firstGiliDay = g === -1 ? null : (countries[g].weeks[0] || {}).days;
                if (firstGiliDay && firstGiliDay[0] && /Padangbai/i.test(firstGiliDay[0].label || '')) {
                    firstGiliDay[0].label = 'מעבר מתטבטו לגילי אייר (Villa Bagus)';
                }
            }
        }
    ];

    function applyMigrations(persist) {
        var countries = tripData.countries || [];
        var ran = false;
        MIGRATIONS.forEach(function (m) {
            if (appliedMigrations.indexOf(m.id) !== -1) return;
            try { m.apply(countries); } catch (e) { console.warn('itinerary migration', m.id, e); }
            /* Marked as done even if it found nothing to change — it ran. */
            appliedMigrations.push(m.id);
            ran = true;
        });
        if (!ran) return false;
        recomputeDates();
        if (persist) saveOverride();
        return true;
    }

    /* Apply any saved override immediately (synchronous, top-level) so every
       script loaded after this one sees the corrected tripData.countries. */
    var hasLocalOverride = loadOverrideFromLocalStorage();

    /* Migrate the local copy right away so the first paint is already correct,
       but when Firestore is configured leave the WRITE to the snapshot handler
       below — a stale localStorage copy must not overwrite a newer plan saved
       from another device. */
    if (hasLocalOverride) applyMigrations(typeof db === 'undefined' || !db);

    /* ---- editor UI — lives inside the existing #countryCards grid on the
       homepage. renderCountryCards() (js/main.js) always emits the order
       badge + edit-row markup; CSS shows/hides them via the "is-editing"
       class this file toggles on the container. All interaction uses event
       delegation on the (stable) #countryCards container so it survives the
       innerHTML rebuilds that happen on every tripdatachange. ---- */

    function renderTotal() {
        var el = document.getElementById('itineraryTotal');
        if (!el) return;
        var n = totalNights();
        el.textContent = n + '/' + TRIP_TOTAL_NIGHTS + ' לילות' + (n === TRIP_TOTAL_NIGHTS ? '' : ' ⚠️');
        el.classList.toggle('itinerary-total--warn', n !== TRIP_TOTAL_NIGHTS);
    }

    function moveCountry(idx, delta) {
        var arr = tripData.countries;
        var newIdx = idx + delta;
        if (!arr[idx] || newIdx < 0 || newIdx >= arr.length) return;
        var tmp = arr[idx]; arr[idx] = arr[newIdx]; arr[newIdx] = tmp;
        recomputeDates();
        saveOverride();
        notifyChange();
    }

    function removeCountry(idx) {
        var country = tripData.countries[idx];
        if (!country) return;
        if (!confirm('להסיר את "' + country.name + '" מהמסלול? המידע שנשמר לימים שלו (תמונות/קבצים/ציר זמן) יישאר בענן ולא יימחק — אפשר לשחזר בהוספה חוזרת של אותו יעד.')) return;
        tripData.countries.splice(idx, 1);
        recomputeDates();
        saveOverride();
        notifyChange();
    }

    function renderAddOptions() {
        var select = document.getElementById('addDestSelect');
        if (!select || select.options.length) return; // build once
        var opts = CANDIDATE_DESTINATIONS.map(function (c) {
            return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>';
        }).join('');
        select.innerHTML = opts + '<option value="__custom__">יעד חדש...</option>';
    }

    function onAddDestChange() {
        var select = document.getElementById('addDestSelect');
        var customInput = document.getElementById('addDestCustomName');
        var nightsInput = document.getElementById('addDestNights');
        var preview = document.getElementById('addDestPreview');
        if (!select || !customInput) return;
        var isCustom = select.value === '__custom__';
        customInput.hidden = !isCustom;
        if (isCustom) {
            customInput.value = '';
            customInput.focus();
            if (preview) preview.hidden = true;
        } else {
            var candidate = CANDIDATE_DESTINATIONS.filter(function (c) { return c.id === select.value; })[0];
            if (candidate && nightsInput) nightsInput.value = candidate.defaultNights;
            if (candidate && preview) {
                document.getElementById('addDestPreviewTitle').textContent = candidate.title;
                document.getElementById('addDestPreviewLead').textContent = candidate.lead;
                preview.hidden = false;
            }
        }
    }

    function onAddDestSubmit() {
        var select = document.getElementById('addDestSelect');
        var customInput = document.getElementById('addDestCustomName');
        var nightsInput = document.getElementById('addDestNights');
        if (!select) return;
        var isCustom = select.value === '__custom__';
        var candidate = isCustom ? null : CANDIDATE_DESTINATIONS.filter(function (c) { return c.id === select.value; })[0];
        var name = isCustom ? (customInput.value || '').trim() : (candidate || {}).name;
        if (!name) { alert('נא להזין שם ליעד.'); return; }
        var id = isCustom ? slugify(name) : select.value;
        if ((tripData.countries || []).some(function (c) { return c.id === id; })) { alert('היעד הזה כבר במסלול.'); return; }

        var country = { id: id, name: name, intro: candidate ? candidate.lead : '', weeks: [{ weekNum: 1, label: '', days: [] }] };
        setCountryNights(country, (nightsInput && nightsInput.value) || 2);
        tripData.countries.push(country);
        recomputeDates();
        saveOverride();
        notifyChange();

        if (customInput) customInput.value = '';
        select.selectedIndex = 0;
        onAddDestChange();
    }

    function toggleEditMode() {
        editModeOn = !editModeOn;
        var toggle = document.getElementById('itineraryEditToggle');
        var addWrap = document.getElementById('itineraryAdd');
        var grid = document.getElementById('countryCards');
        if (toggle) {
            toggle.textContent = editModeOn ? 'סיום עריכה ✏️' : 'ערוך מסלול ✏️';
            toggle.classList.toggle('active', editModeOn);
        }
        if (addWrap) addWrap.hidden = !editModeOn;
        if (grid) grid.classList.toggle('is-editing', editModeOn);
    }

    /* Pointer-based drag reorder (works for mouse + touch, unlike the native
       HTML5 DnD API which touch browsers don't support). Uses
       elementFromPoint so it works correctly whether the grid is 1 or 2
       columns wide, without any manual layout math. */
    function attachDragHandlers(grid) {
        var dragIdx = null;
        var dragEl = null;

        function clearDropTargets() {
            grid.querySelectorAll('.country-card').forEach(function (c) {
                c.classList.remove('drop-target', 'is-dragging');
            });
        }

        grid.addEventListener('pointerdown', function (e) {
            var handle = e.target.closest('.country-card__drag');
            if (!handle) return;
            var card = handle.closest('.country-card');
            if (!card) return;
            dragIdx = parseInt(card.getAttribute('data-idx'), 10);
            dragEl = card;
            card.classList.add('is-dragging');
            try { handle.setPointerCapture(e.pointerId); } catch (err) {}
            e.preventDefault();
        });

        grid.addEventListener('pointermove', function (e) {
            if (dragIdx === null) return;
            var target = document.elementFromPoint(e.clientX, e.clientY);
            var overCard = target && target.closest && target.closest('.country-card');
            grid.querySelectorAll('.country-card').forEach(function (c) { c.classList.remove('drop-target'); });
            if (overCard && overCard !== dragEl) overCard.classList.add('drop-target');
        });

        grid.addEventListener('pointerup', function (e) {
            if (dragIdx === null) return;
            var target = document.elementFromPoint(e.clientX, e.clientY);
            var overCard = target && target.closest && target.closest('.country-card');
            clearDropTargets();
            if (overCard && overCard !== dragEl) {
                var targetIdx = parseInt(overCard.getAttribute('data-idx'), 10);
                var arr = tripData.countries;
                var moved = arr.splice(dragIdx, 1)[0];
                arr.splice(targetIdx, 0, moved);
                recomputeDates();
                saveOverride();
                notifyChange();
            }
            dragIdx = null;
            dragEl = null;
        });

        grid.addEventListener('pointercancel', function () {
            clearDropTargets();
            dragIdx = null;
            dragEl = null;
        });
    }

    function initItineraryEditor() {
        var grid = document.getElementById('countryCards');
        if (!grid) return; // homepage only

        renderAddOptions();
        renderTotal();

        var toggle = document.getElementById('itineraryEditToggle');
        if (toggle) toggle.addEventListener('click', toggleEditMode);

        grid.addEventListener('click', function (e) {
            var upBtn = e.target.closest('.country-card__up');
            var downBtn = e.target.closest('.country-card__down');
            var removeBtn = e.target.closest('.country-card__remove');
            if (upBtn) { e.preventDefault(); moveCountry(parseInt(upBtn.closest('.country-card').getAttribute('data-idx'), 10), -1); }
            else if (downBtn) { e.preventDefault(); moveCountry(parseInt(downBtn.closest('.country-card').getAttribute('data-idx'), 10), 1); }
            else if (removeBtn) { e.preventDefault(); removeCountry(parseInt(removeBtn.closest('.country-card').getAttribute('data-idx'), 10)); }
        });

        grid.addEventListener('change', function (e) {
            if (!e.target.classList.contains('country-card__nights-input')) return;
            var card = e.target.closest('.country-card');
            var idx = parseInt(card.getAttribute('data-idx'), 10);
            var country = tripData.countries[idx];
            if (!country) return;
            setCountryNights(country, e.target.value);
            recomputeDates();
            saveOverride();
            notifyChange();
        });

        attachDragHandlers(grid);

        var select = document.getElementById('addDestSelect');
        if (select) select.addEventListener('change', onAddDestChange);

        var addBtn = document.getElementById('addDestBtn');
        if (addBtn) addBtn.addEventListener('click', onAddDestSubmit);

        onAddDestChange();
    }

    /* Every page (not just the homepage) needs nav to reflect the itinerary,
       so wire the re-render up globally rather than only inside the editor UI. */
    document.addEventListener('tripdatachange', function () {
        if (typeof renderDestNav === 'function') renderDestNav();
        if (typeof renderCountryCards === 'function') renderCountryCards();
        if (typeof renderTripSummary === 'function') renderTripSummary();
        renderTotal();
    });

    /* Cloud itinerary must be live on EVERY page, not just the homepage —
       initItineraryEditor() returns early without #countryCards, so subscribing
       from inside it left every pages/*.html reading only this browser's
       localStorage (i.e. the hardcoded default on any other device). */
    subscribeOverride();

    document.addEventListener('DOMContentLoaded', function () {
        if (typeof renderDestNav === 'function') renderDestNav();
        if (typeof renderTripSummary === 'function') renderTripSummary();
        initItineraryEditor();
    });
})();
