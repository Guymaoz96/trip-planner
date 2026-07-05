(function () {
    'use strict';

    var TRIP_START = '2026-07-19';
    var TRIP_TOTAL_NIGHTS = 26;
    var LS_KEY = 'itinerary_override';
    var editModeOn = false;

    /* Ideas already written up on pages/more-destinations.html. Picking one
       here pre-fills name + a sensible default night count. */
    var CANDIDATE_DESTINATIONS = [
        { id: 'amed', name: 'עמד', defaultNights: 2 },
        { id: 'lombok', name: 'לומבוק', defaultNights: 5 },
        { id: 'secretgilis', name: 'Secret Gilis', defaultNights: 2 },
        { id: 'flores', name: 'פלורס', defaultNights: 7 }
    ];

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

    function saveOverride() {
        try { localStorage.setItem(LS_KEY, JSON.stringify({ countries: tripData.countries })); } catch (e) {}
        if (typeof db !== 'undefined' && db) {
            try {
                db.collection('tripConfig').doc('main').set({
                    countries: tripData.countries,
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
                    try { localStorage.setItem(LS_KEY, JSON.stringify({ countries: tripData.countries })); } catch (e) {}
                    notifyChange();
                }
            }, function (err) { console.warn('itinerary load', err); });
        } catch (e) {}
    }

    function notifyChange() {
        document.dispatchEvent(new CustomEvent('tripdatachange'));
    }

    /* Apply any saved override immediately (synchronous, top-level) so every
       script loaded after this one sees the corrected tripData.countries. */
    loadOverrideFromLocalStorage();

    /* ---- editor UI ---- */

    function dayRangeLabel(country) {
        var days = [];
        country.weeks.forEach(function (w) { days = days.concat(w.days); });
        if (!days.length) return '';
        var first = days[0], last = days[days.length - 1];
        if (!first.date || !last.date) return '';
        if (first.date === last.date) return formatDate(first.date);
        return formatDate(first.date) + ' – ' + formatDate(last.date);
    }

    function renderTotal() {
        var el = document.getElementById('itineraryTotal');
        if (!el) return;
        var n = totalNights();
        el.textContent = n + '/' + TRIP_TOTAL_NIGHTS + ' לילות' + (n === TRIP_TOTAL_NIGHTS ? '' : ' ⚠️');
        el.classList.toggle('itinerary-total--warn', n !== TRIP_TOTAL_NIGHTS);
    }

    function renderList() {
        var list = document.getElementById('itineraryList');
        if (!list) return;
        var countries = tripData.countries || [];
        list.innerHTML = countries.map(function (c, i) {
            var nights = countryNights(c);
            var controls = '';
            if (editModeOn) {
                controls =
                    '<div class="itinerary-row__controls">' +
                    '<label class="itinerary-row__nights-label">לילות ' +
                    '<input type="number" class="itinerary-row__nights-input" min="1" value="' + nights + '" data-idx="' + i + '"></label>' +
                    '<button type="button" class="edit-btn itinerary-row__up" data-idx="' + i + '" ' + (i === 0 ? 'disabled' : '') + ' title="הזז מעלה" aria-label="הזז מעלה">▲</button>' +
                    '<button type="button" class="edit-btn itinerary-row__down" data-idx="' + i + '" ' + (i === countries.length - 1 ? 'disabled' : '') + ' title="הזז מטה" aria-label="הזז מטה">▼</button>' +
                    '<button type="button" class="delete-btn itinerary-row__remove" data-idx="' + i + '" title="הסר יעד" aria-label="הסר יעד">🗑️</button>' +
                    '</div>';
            }
            return (
                '<li class="itinerary-row">' +
                '<div class="itinerary-row__main">' +
                '<span class="itinerary-row__name">' + esc(c.name) + '</span>' +
                '<span class="itinerary-row__meta">' + esc(dayRangeLabel(c)) + ' · ' + nights + ' לילות</span>' +
                '</div>' +
                controls +
                '</li>'
            );
        }).join('');

        if (!editModeOn) return;
        list.querySelectorAll('.itinerary-row__nights-input').forEach(function (inp) {
            inp.addEventListener('change', function () {
                var idx = parseInt(inp.getAttribute('data-idx'), 10);
                var country = tripData.countries[idx];
                if (!country) return;
                setCountryNights(country, inp.value);
                recomputeDates();
                saveOverride();
                notifyChange();
            });
        });
        list.querySelectorAll('.itinerary-row__up').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var idx = parseInt(btn.getAttribute('data-idx'), 10);
                if (idx <= 0) return;
                var arr = tripData.countries;
                var tmp = arr[idx - 1]; arr[idx - 1] = arr[idx]; arr[idx] = tmp;
                recomputeDates();
                saveOverride();
                notifyChange();
            });
        });
        list.querySelectorAll('.itinerary-row__down').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var idx = parseInt(btn.getAttribute('data-idx'), 10);
                var arr = tripData.countries;
                if (idx >= arr.length - 1) return;
                var tmp = arr[idx + 1]; arr[idx + 1] = arr[idx]; arr[idx] = tmp;
                recomputeDates();
                saveOverride();
                notifyChange();
            });
        });
        list.querySelectorAll('.itinerary-row__remove').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var idx = parseInt(btn.getAttribute('data-idx'), 10);
                var country = tripData.countries[idx];
                if (!country) return;
                if (!confirm('להסיר את "' + country.name + '" מהמסלול? המידע שנשמר לימים שלו (תמונות/קבצים/ציר זמן) יישאר בענן ולא יימחק — אפשר לשחזר בהוספה חוזרת של אותו יעד.')) return;
                tripData.countries.splice(idx, 1);
                recomputeDates();
                saveOverride();
                notifyChange();
            });
        });
    }

    function renderAddForm() {
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
        if (!select || !customInput) return;
        var isCustom = select.value === '__custom__';
        customInput.hidden = !isCustom;
        if (isCustom) { customInput.value = ''; customInput.focus(); }
        else {
            var candidate = CANDIDATE_DESTINATIONS.filter(function (c) { return c.id === select.value; })[0];
            if (candidate && nightsInput) nightsInput.value = candidate.defaultNights;
        }
    }

    function onAddDestSubmit() {
        var select = document.getElementById('addDestSelect');
        var customInput = document.getElementById('addDestCustomName');
        var nightsInput = document.getElementById('addDestNights');
        if (!select) return;
        var isCustom = select.value === '__custom__';
        var name = isCustom ? (customInput.value || '').trim() : (CANDIDATE_DESTINATIONS.filter(function (c) { return c.id === select.value; })[0] || {}).name;
        if (!name) { alert('נא להזין שם ליעד.'); return; }
        var id = isCustom ? slugify(name) : select.value;
        if ((tripData.countries || []).some(function (c) { return c.id === id; })) { alert('היעד הזה כבר במסלול.'); return; }

        var country = { id: id, name: name, intro: '', weeks: [{ weekNum: 1, label: '', days: [] }] };
        setCountryNights(country, (nightsInput && nightsInput.value) || 2);
        tripData.countries.push(country);
        recomputeDates();
        saveOverride();
        notifyChange();

        if (customInput) customInput.value = '';
        select.selectedIndex = 0;
        onAddDestChange();
    }

    function renderEverything() {
        renderTotal();
        renderList();
    }

    function toggleEditMode() {
        editModeOn = !editModeOn;
        var toggle = document.getElementById('itineraryEditToggle');
        var addWrap = document.getElementById('itineraryAdd');
        if (toggle) {
            toggle.textContent = editModeOn ? 'סיום עריכה ✏️' : 'ערוך מסלול ✏️';
            toggle.classList.toggle('active', editModeOn);
        }
        if (addWrap) addWrap.hidden = !editModeOn;
        renderList();
    }

    function initItineraryEditor() {
        var section = document.querySelector('.itinerary-section');
        if (!section) return; // homepage only
        renderAddForm();
        renderEverything();

        var toggle = document.getElementById('itineraryEditToggle');
        if (toggle) toggle.addEventListener('click', toggleEditMode);

        var select = document.getElementById('addDestSelect');
        if (select) select.addEventListener('change', onAddDestChange);

        var addBtn = document.getElementById('addDestBtn');
        if (addBtn) addBtn.addEventListener('click', onAddDestSubmit);

        onAddDestChange();
        subscribeOverride();
    }

    /* Every page (not just the homepage) needs nav to reflect the itinerary,
       so wire the re-render up globally rather than only inside the editor UI. */
    document.addEventListener('tripdatachange', function () {
        if (typeof renderDestNav === 'function') renderDestNav();
        if (typeof renderCountryCards === 'function') renderCountryCards();
        if (typeof renderTripSummary === 'function') renderTripSummary();
        renderEverything();
    });

    document.addEventListener('DOMContentLoaded', function () {
        if (typeof renderDestNav === 'function') renderDestNav();
        if (typeof renderTripSummary === 'function') renderTripSummary();
        initItineraryEditor();
    });
})();
