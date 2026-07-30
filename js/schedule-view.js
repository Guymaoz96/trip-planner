/* ─────────────────────────────────────────────────────────────────────────
   SCHEDULE (calendar) VIEW — homepage alternative to the destination cards.

   Renders tripData.countries as a real month calendar: one cell per calendar
   day, colored by the destination we sleep at that night, plus the check-out
   morning at the end of the trip.

   Key rule (same as checkoutDate() in js/main.js): a `day` entry is a NIGHT.
   The morning after the last night in A is also the check-in day in B, so the
   cell for that date belongs to B and is tagged "מעבר מ־A".

   Re-renders on `tripdatachange`, like every other surface that shows
   destinations (see CLAUDE.md).
   ───────────────────────────────────────────────────────────────────────── */
(function () {
    'use strict';

    var LS_VIEW_KEY = 'home_view_mode'; // 'cards' | 'schedule'
    var DOW_SHORT = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
    var DOW_LONG = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    var MONTHS_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    /* Used only for destinations with no color anywhere (a custom name typed
       into the editor) — keeps the calendar readable instead of all-grey. */
    var FALLBACK_COLORS = ['#ff9a9e', '#88d8c0', '#a8c0ff', '#ffc38b', '#c3a8ff', '#8bd3ff', '#ffb3c8', '#f4a261', '#90e0ef', '#caffbf'];

    function esc(s) {
        if (s == null) return '';
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function destColor(id, idx) {
        var meta = (window.STOP_META || {})[id];
        if (meta && meta.color) return meta.color;
        if (typeof DESTINATION_CATALOG !== 'undefined') {
            var c = DESTINATION_CATALOG.filter(function (d) { return d.id === id; })[0];
            if (c && c.color) return c.color;
        }
        return FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
    }

    function withAlpha(hex, alphaHex) {
        return /^#[0-9a-f]{6}$/i.test(hex) ? hex + alphaHex : hex;
    }

    function parseIso(iso) { return new Date(iso + 'T12:00:00'); }

    function isoOf(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function todayIso() { return isoOf(new Date()); }

    /* date → which destination we sleep at that night, in itinerary order. */
    function buildIndex() {
        var byDate = {};
        var dates = [];
        (tripData.countries || []).forEach(function (c, ci) {
            var days = [];
            c.weeks.forEach(function (w) { days = days.concat(w.days); });
            days.forEach(function (d, di) {
                if (!d.date) return;
                byDate[d.date] = {
                    country: c,
                    idx: ci,
                    color: destColor(c.id, ci),
                    isCheckIn: di === 0,
                    prev: di === 0 && ci > 0 ? tripData.countries[ci - 1] : null,
                    label: d.label || ''
                };
                dates.push(d.date);
            });
        });
        dates.sort();
        return { byDate: byDate, first: dates[0], lastNight: dates[dates.length - 1] };
    }

    function monthSpanTitle(start, end) {
        var a = MONTHS_HE[start.getMonth()];
        var b = MONTHS_HE[end.getMonth()];
        var years = start.getFullYear() === end.getFullYear()
            ? ' ' + start.getFullYear()
            : ' ' + start.getFullYear() + '–' + end.getFullYear();
        return (a === b ? a : a + ' – ' + b) + years;
    }

    /* `tail` marks the two cells past the last night: 'depart' is the check-out
       day, spent in Indonesia until the night flight, and 'land' is the morning
       we get home. Both are derived in js/main.js, not stored as days. */
    function dayCell(iso, info, tail, today) {
        var d = parseIso(iso);
        var dowLong = DOW_LONG[d.getDay()];
        /* The grid runs continuously across months, so the 1st spells its
           month out — that's the only month marker there is. */
        var dateTxt = d.getDate() === 1
            ? '1 ב' + MONTHS_HE[d.getMonth()]
            : d.getDate() + '.' + (d.getMonth() + 1);
        var isToday = iso === today;
        var dateCls = 'sched-day__date' + (d.getDate() === 1 ? ' sched-day__date--month' : '');

        if (tail || !info) {
            /* !info with no tail can only happen if the itinerary has a date
               gap, which recomputeDates() prevents — render a neutral day. */
            var name = 'יום פנוי';
            var endTag = '';
            if (tail === 'depart') { name = 'טיסה הביתה ✈️'; endTag = 'צ׳ק-אאוט · טיסת לילה'; }
            else if (tail === 'land') { name = 'נחיתה בארץ 🛬'; endTag = 'סוף הטיול'; }
            return '<div class="sched-day sched-day--end' + (isToday ? ' is-today' : '') + '">' +
                '<span class="sched-day__dow">' + dowLong + '</span>' +
                '<span class="' + dateCls + '">' + dateTxt + '</span>' +
                '<span class="sched-day__name">' + name + '</span>' +
                (endTag ? '<span class="sched-day__tag">' + endTag + '</span>' : '') +
                '</div>';
        }

        var color = info.color;
        var tag = '';
        if (info.prev) tag = 'מעבר מ' + info.prev.name;
        else if (info.isCheckIn) tag = 'צ׳ק-אין';

        return '<a class="sched-day sched-day--stay' + (isToday ? ' is-today' : '') + '"' +
            ' href="' + esc(countryHref(info.country.id, sitePagesPrefix())) + '"' +
            ' style="--dest-color:' + esc(color) + ';--dest-bg:' + esc(withAlpha(color, '2e')) + '"' +
            ' title="' + esc(info.label) + '">' +
            '<span class="sched-day__dow">' + dowLong + '</span>' +
            '<span class="' + dateCls + '">' + dateTxt + '</span>' +
            '<span class="sched-day__name">' + esc(info.country.name) + '</span>' +
            (tag ? '<span class="sched-day__tag">' + esc(tag) + '</span>' : '') +
            '</a>';
    }

    function blankCell() { return '<div class="sched-day sched-day--blank" aria-hidden="true"></div>'; }

    function renderLegend() {
        var items = (tripData.countries || []).map(function (c, ci) {
            var days = [];
            c.weeks.forEach(function (w) { days = days.concat(w.days); });
            if (!days.length || !days[0].date) return '';
            var inD = parseIso(days[0].date);
            var outD = parseIso(checkoutDate(days[days.length - 1].date));
            var range = inD.getDate() + '.' + (inD.getMonth() + 1) + ' – ' + outD.getDate() + '.' + (outD.getMonth() + 1);
            var color = destColor(c.id, ci);
            return '<a class="sched-legend__item" href="' + esc(countryHref(c.id, sitePagesPrefix())) + '"' +
                ' style="--dest-color:' + esc(color) + ';--dest-bg:' + esc(withAlpha(color, '2e')) + '">' +
                '<span class="sched-legend__dot"></span>' +
                '<span class="sched-legend__name">' + esc(c.name) + '</span>' +
                '<span class="sched-legend__meta">' + range + ' · ' + days.length + ' לילות</span>' +
                '</a>';
        }).join('');
        return items ? '<div class="sched-legend">' + items + '</div>' : '';
    }

    function render() {
        var host = document.getElementById('scheduleView');
        if (!host) return;
        var index = buildIndex();
        if (!index.first) { host.innerHTML = ''; return; }

        /* The grid runs one day past check-out: the last night is the flight
           home, so the trip ends on the landing date, not at check-out. */
        var departIso = tripDepartureDate() || checkoutDate(index.lastNight);
        var landIso = tripLandingDate();
        var today = todayIso();
        var cursor = parseIso(index.first);
        var end = parseIso(landIso || departIso);

        /* One continuous grid for the whole trip — the weeks run straight from
           July into August with no month break; the month is called out on the
           1st of each month instead (sched-day__month). */
        var html = '<section class="sched-month">' +
            '<h3 class="sched-month__title">' + monthSpanTitle(cursor, end) + '</h3>' +
            '<div class="sched-dow-row">' + DOW_SHORT.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>' +
            '<div class="sched-grid">';

        for (var b = 0; b < cursor.getDay(); b++) html += blankCell();

        var trail = 0;
        while (cursor <= end) {
            var iso = isoOf(cursor);
            var info = index.byDate[iso];
            var tail = '';
            if (!info && iso === departIso) tail = 'depart';
            else if (!info && iso === landIso) tail = 'land';
            html += dayCell(iso, info, tail, today);
            trail = 6 - cursor.getDay();
            cursor.setDate(cursor.getDate() + 1);
        }
        for (var t = 0; t < trail; t++) html += blankCell();

        host.innerHTML = html + '</div></section>' + renderLegend();
    }

    /* ---- view switch (cards ⇄ schedule) ---- */

    function applyView(mode) {
        var cards = document.getElementById('countryCards');
        var schedule = document.getElementById('scheduleView');
        var addWrap = document.getElementById('itineraryAdd');
        var editToggle = document.getElementById('itineraryEditToggle');
        var isSchedule = mode === 'schedule';

        if (cards) cards.hidden = isSchedule;
        if (schedule) schedule.hidden = !isSchedule;
        /* Editing is a cards-view affordance; hide its controls (and any open
           add-panel) rather than leaving orphaned buttons above the calendar. */
        if (editToggle) editToggle.hidden = isSchedule;
        if (addWrap && isSchedule) addWrap.hidden = true;
        else if (addWrap && editToggle && editToggle.classList.contains('active')) addWrap.hidden = false;

        document.querySelectorAll('#viewSwitch .view-switch__btn').forEach(function (btn) {
            var active = btn.getAttribute('data-view') === mode;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        if (isSchedule) render();
        try { localStorage.setItem(LS_VIEW_KEY, mode); } catch (e) {}
    }

    function currentMode() {
        try { return localStorage.getItem(LS_VIEW_KEY) === 'schedule' ? 'schedule' : 'cards'; } catch (e) { return 'cards'; }
    }

    function init() {
        var host = document.getElementById('scheduleView');
        if (!host) return; // homepage only
        var sw = document.getElementById('viewSwitch');
        if (sw) {
            sw.addEventListener('click', function (e) {
                var btn = e.target.closest('.view-switch__btn');
                if (!btn) return;
                applyView(btn.getAttribute('data-view'));
            });
        }
        applyView(currentMode());
    }

    document.addEventListener('tripdatachange', function () {
        var host = document.getElementById('scheduleView');
        if (host && !host.hidden) render();
    });

    document.addEventListener('DOMContentLoaded', init);
})();
