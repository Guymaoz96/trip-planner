(function () {
    'use strict';
    /* Expense log — rewritten July 2026.
       One continuous log of expenses (not planned-vs-actual). Amounts entered
       in Rp / $ / € are converted to ₪ at the live rate (frankfurter.app,
       same source as js/currency.js) with an editable result. Persistence
       follows the site pattern: localStorage first, Firestore budget/expenses
       when configured. The old budget/main doc is untouched.
       Cash rule (same as the Thailand sheet): ATM withdrawals / money changes
       are logged under קטגוריית מזומן — individual cash purchases are NOT
       logged, so nothing is counted twice. */

    var DOC_ID = 'expenses';
    var LS_KEY = 'expenses_v1';

    var CATS = [
        { key: 'אוכל', emoji: '🍜', color: '#f6a13c' },
        { key: 'לינה', emoji: '🏨', color: '#2c5f8d' },
        { key: 'פעילויות', emoji: '🤿', color: '#00a8a8' },
        { key: 'תחבורה', emoji: '🛵', color: '#8e6cc0' },
        { key: 'קניות', emoji: '🛍️', color: '#e05c8a' },
        { key: 'מזומן', emoji: '🏧', color: '#5aa15d' },
        { key: 'טיסות', emoji: '✈️', color: '#5a7d9a' },
        { key: 'ביטוח ומסמכים', emoji: '📄', color: '#a08a5a' },
        { key: 'אחר', emoji: '📦', color: '#7a8699' }
    ];
    function catMeta(key) {
        for (var i = 0; i < CATS.length; i++) if (CATS[i].key === key) return CATS[i];
        return CATS[CATS.length - 1];
    }

    var CURRENCIES = [
        { code: 'IDR', sym: 'Rp', fallback: 5990 },
        { code: 'ILS', sym: '₪' },
        { code: 'USD', sym: '$', fallback: 0.333 },
        { code: 'EUR', sym: '€', fallback: 0.31 }
    ];

    /* ---- seed: everything known up to 24.7.26 (screenshots + flights).
       Applied ONCE, only when the store is completely empty, so deleting a
       seeded row sticks. New batches from screenshots arrive via the import
       box below, with stable ids so re-importing never duplicates. */
    var SEED = [
        { id: 's-fl-guy', d: '2026-07-01', t: 'טיסות גיא הלוך ושוב', c: 'טיסות', ils: 4705 },
        { id: 's-fl-adi1', d: '2026-07-01', t: 'טיסה עדי לאינדונזיה', c: 'טיסות', ils: 2500 },
        { id: 's-fl-adi2', d: '2026-07-01', t: 'טיסה עדי אינדונזיה–אתונה', c: 'טיסות', ils: 1648 },
        { id: 's-fl-ath', d: '2026-07-01', t: 'טיסה אתונה–רודוס', c: 'טיסות', ils: 356 },
        { id: 's-fl-rho', d: '2026-07-01', t: 'טיסה רודוס–תל אביב', c: 'טיסות', ils: 880 },
        { id: 's-ins-guy', d: '2026-07-15', t: 'ביטוח נסיעות – גיא', c: 'ביטוח ומסמכים', ils: 576 },
        { id: 's-visa', d: '2026-07-10', t: 'ויזה מראש (נגנבה, לא נוצלה)', c: 'ביטוח ומסמכים', ils: 375 },
        { id: 's-abnb-0716', d: '2026-07-16', t: 'Airbnb – הזמנה מראש', c: 'לינה', ils: 1471.9, src: 'adi' },
        { id: 's-ins-adi', d: '2026-07-19', t: 'ביטוח נסיעות הראל – עדי', c: 'ביטוח ומסמכים', ils: 259.25, src: 'adi' },
        { id: 's-sim-guy', d: '2026-07-19', t: 'סים לגיא', c: 'אחר', ils: 26 },
        { id: 's-fx-usd', d: '2026-07-19', t: 'המרת 300$ בשדה (שער יקר)', c: 'מזומן', ils: 956, amt: 300, cur: 'USD' },
        { id: 'g-laggas-0720', d: '2026-07-20', t: 'Laggas Uluwatu', c: 'אוכל', ils: 75.31, src: 'guy' },
        { id: 'g-baked-0720', d: '2026-07-20', t: 'Baked', c: 'אוכל', ils: 54.15, src: 'guy' },
        { id: 'g-monsoleil-0721', d: '2026-07-21', t: 'Mon Soleil Bali', c: 'אוכל', ils: 174.2, src: 'guy' },
        { id: 'g-artisan-0721', d: '2026-07-21', t: 'Artisan Bingin', c: 'אוכל', ils: 64.13, src: 'guy' },
        { id: 'g-cashew-0721', d: '2026-07-21', t: 'The Cashew Tree', c: 'אוכל', ils: 25.87, src: 'guy' },
        { id: 'g-drifter-0721', d: '2026-07-21', t: 'Drifter (בגדים)', c: 'קניות', ils: 42.61, src: 'guy' },
        { id: 'g-boxmart-0721', d: '2026-07-21', t: 'Box Mart Suluban (בירות וחטיפים)', c: 'אוכל', ils: 15.89, src: 'guy' },
        { id: 'a-booking-0721', d: '2026-07-21', t: 'Booking.com – מלון', c: 'לינה', ils: 238.33, src: 'adi' },
        { id: 'a-yoga-0721', d: '2026-07-21', t: 'Alchemy Yoga Uluwatu', c: 'פעילויות', ils: 54.67, src: 'adi' },
        { id: 'a-dreamland-0721', d: '2026-07-21', t: 'Dreamland Beach', c: 'פעילויות', ils: 10.44, src: 'adi' },
        { id: 'a-abnb-0721', d: '2026-07-21', t: 'Airbnb', c: 'לינה', ils: 89.94, src: 'adi' },
        { id: 'g-localbrand-0722', d: '2026-07-22', t: 'The Local Brand', c: 'קניות', ils: 278.09, src: 'guy' },
        { id: 'g-balangan-0722', d: '2026-07-22', t: 'Balangan Wave (גלישה)', c: 'פעילויות', ils: 211.88, src: 'guy' }
    ];

    var state = { items: [], rates: null, cur: 'IDR', cat: 'אוכל', editId: null };

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = String(s == null ? '' : s);
        return d.innerHTML;
    }
    function fmtIls(n) {
        var v = Math.round(n);
        return v.toLocaleString('he-IL') + ' ₪';
    }
    function todayStr() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function newId(item) {
        /* stable: src|date|amount|start of description — same line twice → same id */
        var base = (item.src || 'x') + '|' + item.d + '|' + item.ils + '|' + String(item.t || '').slice(0, 12);
        var h = 0;
        for (var i = 0; i < base.length; i++) { h = ((h << 5) - h + base.charCodeAt(i)) | 0; }
        return 'e' + Math.abs(h).toString(36);
    }

    /* ---- trip calendar (derived from tripData so itinerary edits follow) ---- */
    function tripRanges() {
        var out = [];
        var countries = (typeof tripData !== 'undefined' && tripData.countries) || [];
        countries.forEach(function (c) {
            var days = [];
            (c.weeks || []).forEach(function (w) { days = days.concat(w.days || []); });
            if (!days.length) return;
            out.push({ id: c.id, name: c.name, first: days[0].date, last: days[days.length - 1].date });
        });
        return out;
    }
    function tripStart() {
        var r = tripRanges();
        return (r[0] && r[0].first) || '2026-07-19';
    }
    function destFor(dateStr) {
        var ranges = tripRanges();
        if (!ranges.length) return '';
        if (dateStr < ranges[0].first) return 'לפני הטיול';
        for (var i = 0; i < ranges.length; i++) {
            var next = ranges[i + 1];
            if (dateStr >= ranges[i].first && (!next || dateStr < next.first)) return ranges[i].name;
        }
        return 'סוף הטיול';
    }

    /* ---- persistence (site pattern: LS first, Firestore preferred) ---- */
    function saveLs(items) {
        try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch (e) {}
    }
    function loadLs() {
        try { var r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; }
    }
    function saveFs(items) {
        if (typeof db === 'undefined' || !db) return;
        try {
            db.collection('budget').doc(DOC_ID).set({
                items: items,
                seeded: true,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(function (e) { console.warn('expenses save', e); });
        } catch (e) {}
    }
    function setItems(items, skipFs) {
        state.items = items;
        saveLs(items);
        if (!skipFs) saveFs(items);
        render();
    }
    function start() {
        if (typeof db === 'undefined' || !db) {
            var local = loadLs();
            if (local === null) { setItems(SEED.slice(), true); }
            else { state.items = local; render(); }
            return;
        }
        try {
            db.collection('budget').doc(DOC_ID).onSnapshot(function (doc) {
                if (doc.exists && doc.data() && doc.data().items) {
                    state.items = doc.data().items;
                    saveLs(state.items);
                    render();
                } else {
                    var local = loadLs();
                    var items = (local && local.length) ? local : SEED.slice();
                    setItems(items); /* writes the doc → snapshot then settles */
                }
            }, function (err) {
                console.warn('expenses load', err);
                var local = loadLs();
                state.items = local === null ? SEED.slice() : local;
                render();
            });
        } catch (e) {
            var local2 = loadLs();
            state.items = local2 === null ? SEED.slice() : local2;
            render();
        }
    }

    /* ---- FX rates ---- */
    function loadRates() {
        try {
            var ts = parseInt(sessionStorage.getItem('fx_ts2') || '0');
            if (Date.now() - ts < 4 * 3600 * 1000) {
                var r = sessionStorage.getItem('fx_rates2');
                if (r) { state.rates = JSON.parse(r); updateConvert(); return; }
            }
        } catch (e) {}
        fetch('https://api.frankfurter.app/latest?from=ILS&to=IDR,USD,EUR')
            .then(function (r) { return r.json(); })
            .then(function (d) {
                state.rates = d.rates || {};
                try {
                    sessionStorage.setItem('fx_rates2', JSON.stringify(state.rates));
                    sessionStorage.setItem('fx_ts2', String(Date.now()));
                } catch (e) {}
                updateConvert();
            })
            .catch(function () {
                state.rates = { IDR: 5990, USD: 0.333, EUR: 0.31 };
                var st = document.getElementById('expRateNote');
                if (st) st.textContent = '(שער משוער — אין רשת)';
                updateConvert();
            });
    }
    function toIls(amount, cur) {
        if (cur === 'ILS') return amount;
        var r = state.rates && state.rates[cur];
        if (!r) {
            for (var i = 0; i < CURRENCIES.length; i++) if (CURRENCIES[i].code === cur) r = CURRENCIES[i].fallback;
        }
        return r ? amount / r : 0;
    }

    /* ---- add form ---- */
    function updateConvert() {
        var amtEl = document.getElementById('expAmount');
        var outEl = document.getElementById('expIls');
        if (!amtEl || !outEl) return;
        var v = parseFloat(amtEl.value);
        if (state.cur === 'ILS') {
            outEl.value = v ? String(Math.round(v * 100) / 100) : '';
            outEl.readOnly = true;
            return;
        }
        outEl.readOnly = false;
        outEl.value = v ? String(Math.round(toIls(v, state.cur) * 100) / 100) : '';
    }
    function renderCurBtns() {
        var el = document.getElementById('expCurBtns');
        if (!el) return;
        el.innerHTML = CURRENCIES.map(function (c) {
            return '<button type="button" class="exp-cur' + (c.code === state.cur ? ' active' : '') + '" data-cur="' + c.code + '">' + c.sym + '</button>';
        }).join('');
        el.querySelectorAll('.exp-cur').forEach(function (b) {
            b.addEventListener('click', function () {
                state.cur = b.getAttribute('data-cur');
                renderCurBtns();
                updateConvert();
            });
        });
    }
    function renderCatChips() {
        var el = document.getElementById('expCatChips');
        if (!el) return;
        el.innerHTML = CATS.map(function (c) {
            return '<button type="button" class="exp-chip' + (c.key === state.cat ? ' active' : '') + '" data-cat="' + esc(c.key) + '" style="--chip:' + c.color + '">' + c.emoji + ' ' + esc(c.key) + '</button>';
        }).join('');
        el.querySelectorAll('.exp-chip').forEach(function (b) {
            b.addEventListener('click', function () {
                state.cat = b.getAttribute('data-cat');
                renderCatChips();
            });
        });
    }
    function addExpense() {
        var descEl = document.getElementById('expDesc');
        var amtEl = document.getElementById('expAmount');
        var ilsEl = document.getElementById('expIls');
        var dateEl = document.getElementById('expDate');
        var ils = parseFloat(ilsEl.value);
        var t = (descEl.value || '').trim();
        var msg = document.getElementById('expAddMsg');
        if (!ils || !t) {
            if (msg) { msg.textContent = 'צריך גם תיאור וגם סכום'; setTimeout(function () { msg.textContent = ''; }, 2500); }
            return;
        }
        var item = {
            d: dateEl.value || todayStr(),
            t: t,
            c: state.cat,
            ils: Math.round(ils * 100) / 100
        };
        var raw = parseFloat(amtEl.value);
        if (state.cur !== 'ILS' && raw) { item.amt = raw; item.cur = state.cur; }
        item.id = newId(item);
        if (state.items.some(function (i) { return i.id === item.id; })) item.id += '-' + Date.now().toString(36);
        setItems(state.items.concat([item]));
        descEl.value = ''; amtEl.value = ''; ilsEl.value = '';
        if (msg) { msg.textContent = 'נשמר ✓'; setTimeout(function () { msg.textContent = ''; }, 1500); }
    }

    /* ---- import / export ---- */
    function importJson() {
        var ta = document.getElementById('expImport');
        var msg = document.getElementById('expImportMsg');
        if (!ta) return;
        var txt = (ta.value || '').trim();
        if (!txt) return;
        var data;
        try {
            data = JSON.parse(txt);
            if (data && data.items) data = data.items;
            if (!Array.isArray(data)) throw new Error('not array');
        } catch (e) {
            if (msg) msg.textContent = 'פורמט לא תקין — מדביקים את הרשימה שקלוד שלח, כמו שהיא.';
            return;
        }
        var have = {};
        state.items.forEach(function (i) { have[i.id] = 1; });
        var added = 0, skipped = 0;
        var items = state.items.slice();
        data.forEach(function (raw) {
            if (!raw || !raw.d || !raw.t || typeof raw.ils !== 'number') { skipped++; return; }
            var item = { d: raw.d, t: raw.t, c: raw.c || 'אחר', ils: raw.ils };
            if (raw.amt) item.amt = raw.amt;
            if (raw.cur) item.cur = raw.cur;
            if (raw.src) item.src = raw.src;
            item.id = raw.id || newId(item);
            if (have[item.id]) { skipped++; return; }
            have[item.id] = 1;
            items.push(item);
            added++;
        });
        setItems(items);
        if (msg) msg.textContent = 'נוספו ' + added + (skipped ? ' · דולגו ' + skipped + ' (כפולים/שגויים)' : '');
        ta.value = '';
    }
    function exportJson() {
        var txt = JSON.stringify(state.items);
        var msg = document.getElementById('expImportMsg');
        function done() { if (msg) msg.textContent = 'הועתק — אפשר להדביק לקלוד בצ׳אט'; }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(txt).then(done, function () { fallbackCopy(txt); done(); });
        } else { fallbackCopy(txt); done(); }
    }
    function fallbackCopy(txt) {
        var ta = document.getElementById('expImport');
        if (!ta) return;
        ta.value = txt;
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
    }
    function exportCsv() {
        var head = 'תאריך,תיאור,קטגוריה,סכום בשח,סכום מקומי,מטבע\n';
        var rows = state.items.slice().sort(function (a, b) { return a.d < b.d ? -1 : 1; }).map(function (i) {
            return [i.d, '"' + String(i.t).replace(/"/g, '""') + '"', i.c, i.ils, i.amt || '', i.cur || ''].join(',');
        }).join('\n');
        var blob = new Blob(['﻿' + head + rows], { type: 'text/csv;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'honeymoon-expenses.csv';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 500);
    }

    /* ---- summaries ---- */
    function renderSummary() {
        var total = 0, noFlights = 0, onTrip = 0, lastDate = '';
        var start = tripStart();
        state.items.forEach(function (i) {
            var v = parseFloat(i.ils) || 0;
            total += v;
            if (i.c !== 'טיסות') noFlights += v;
            if (i.d >= start && i.c !== 'טיסות') {
                onTrip += v;
                if (i.d > lastDate) lastDate = i.d;
            }
        });
        /* Daily average counts days up to the LAST recorded expense, not up to
           today — the card app updates with a delay, so dividing by "today"
           would understate the average. Capped at today just in case a
           future-dated entry sneaks in. */
        var upTo = lastDate || start;
        var today = todayStr();
        if (upTo > today) upTo = today;
        var days = Math.max(1, Math.round((new Date(upTo + 'T00:00:00') - new Date(start + 'T00:00:00')) / 86400000) + 1);
        var el;
        if ((el = document.getElementById('expSumTotal'))) el.textContent = fmtIls(total);
        if ((el = document.getElementById('expSumNoFl'))) el.textContent = fmtIls(noFlights);
        if ((el = document.getElementById('expSumDaily'))) el.textContent = fmtIls(onTrip / days);
        if ((el = document.getElementById('expSumDailyNote'))) el.textContent = 'לפי ' + days + ' ימים (עד ההוצאה האחרונה שנרשמה), בלי טיסות';
    }
    function renderCatBars() {
        var el = document.getElementById('expCatBars');
        if (!el) return;
        var sums = {};
        state.items.forEach(function (i) { sums[i.c] = (sums[i.c] || 0) + (parseFloat(i.ils) || 0); });
        var entries = Object.keys(sums).map(function (k) { return { k: k, v: sums[k] }; })
            .filter(function (e) { return e.v > 0; })
            .sort(function (a, b) { return b.v - a.v; });
        var max = entries.length ? entries[0].v : 1;
        el.innerHTML = entries.map(function (e) {
            var m = catMeta(e.k);
            var pct = Math.max(4, Math.round(e.v / max * 100));
            return '<div class="exp-bar-row">' +
                '<div class="exp-bar-label">' + m.emoji + ' ' + esc(e.k) + '</div>' +
                '<div class="exp-bar-track"><div class="exp-bar-fill" style="width:' + pct + '%;background:' + m.color + '"></div></div>' +
                '<div class="exp-bar-val">' + fmtIls(e.v) + '</div>' +
                '</div>';
        }).join('') || '<p class="exp-empty">אין נתונים עדיין</p>';
    }
    function renderDestRows() {
        var el = document.getElementById('expDestRows');
        if (!el) return;
        var sums = {};
        state.items.forEach(function (i) {
            var dst = destFor(i.d);
            sums[dst] = (sums[dst] || 0) + (parseFloat(i.ils) || 0);
        });
        var names = ['לפני הטיול'].concat(tripRanges().map(function (r) { return r.name; })).concat(['סוף הטיול']);
        el.innerHTML = names.filter(function (n) { return sums[n]; }).map(function (n) {
            return '<div class="exp-dest-row"><span>' + esc(n) + '</span><b>' + fmtIls(sums[n]) + '</b></div>';
        }).join('');
    }

    /* ---- list ---- */
    var DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    function fmtDayHeader(d) {
        var dt = new Date(d + 'T00:00:00');
        return 'יום ' + DAY_NAMES[dt.getDay()] + ' · ' + dt.getDate() + '.' + (dt.getMonth() + 1);
    }
    function curSym(c) { return c === 'IDR' ? 'Rp' : c === 'USD' ? '$' : c === 'EUR' ? '€' : c; }
    function renderList() {
        var el = document.getElementById('expList');
        if (!el) return;
        if (!state.items.length) {
            el.innerHTML = '<p class="exp-empty">אין עדיין הוצאות. תוסיפו את הראשונה למעלה 👆</p>';
            return;
        }
        var sorted = state.items.slice().sort(function (a, b) {
            return a.d === b.d ? String(a.id).localeCompare(String(b.id)) : (a.d < b.d ? 1 : -1);
        });
        var html = '', lastDate = '';
        sorted.forEach(function (i) {
            if (i.d !== lastDate) {
                lastDate = i.d;
                var daySum = sorted.reduce(function (s, x) { return x.d === i.d ? s + (parseFloat(x.ils) || 0) : s; }, 0);
                html += '<div class="exp-day-head"><span>' + fmtDayHeader(i.d) + '</span><span class="exp-day-sum">' + fmtIls(daySum) + '</span></div>';
            }
            var m = catMeta(i.c);
            var local = (i.amt && i.cur) ? ('<span class="exp-row-local">' + Number(i.amt).toLocaleString('he-IL') + ' ' + curSym(i.cur) + '</span>') : '';
            html += '<div class="exp-row" data-id="' + esc(i.id) + '">' +
                '<span class="exp-row-emoji" style="background:' + m.color + '22">' + m.emoji + '</span>' +
                '<span class="exp-row-main"><span class="exp-row-title">' + esc(i.t) + '</span>' +
                '<span class="exp-row-sub">' + esc(i.c) + (i.src ? ' · כרטיס ' + (i.src === 'guy' ? 'גיא' : 'עדי') : '') + '</span></span>' +
                local +
                '<span class="exp-row-amt">' + fmtIls(i.ils) + '</span>' +
                '</div>';
            if (state.editId === i.id) html += editFormHtml(i);
        });
        el.innerHTML = html;

        el.querySelectorAll('.exp-row').forEach(function (row) {
            row.addEventListener('click', function () {
                var tid = row.getAttribute('data-id');
                state.editId = state.editId === tid ? null : tid;
                renderList();
            });
        });
        bindEditForm(el);
    }
    function editFormHtml(i) {
        var opts = CATS.map(function (c) {
            return '<option value="' + esc(c.key) + '"' + (c.key === i.c ? ' selected' : '') + '>' + c.emoji + ' ' + esc(c.key) + '</option>';
        }).join('');
        return '<div class="exp-edit" data-edit="' + esc(i.id) + '">' +
            '<input type="text" class="exp-edit-desc" value="' + esc(i.t) + '">' +
            '<div class="exp-edit-row">' +
            '<input type="date" class="exp-edit-date" value="' + esc(i.d) + '">' +
            '<select class="exp-edit-cat">' + opts + '</select>' +
            '<span class="exp-edit-ils-wrap"><input type="number" class="exp-edit-ils" value="' + esc(i.ils) + '" step="0.01" min="0" inputmode="decimal"> ₪</span>' +
            '</div>' +
            '<div class="exp-edit-actions">' +
            '<button type="button" class="exp-edit-save">שמירה</button>' +
            '<button type="button" class="exp-edit-del">מחיקה</button>' +
            '</div></div>';
    }
    function bindEditForm(root) {
        var form = root.querySelector('.exp-edit');
        if (!form) return;
        var tid = form.getAttribute('data-edit');
        form.addEventListener('click', function (e) { e.stopPropagation(); });
        form.querySelector('.exp-edit-save').addEventListener('click', function () {
            var items = state.items.map(function (i) {
                if (i.id !== tid) return i;
                var copy = {};
                for (var k in i) copy[k] = i[k];
                copy.t = form.querySelector('.exp-edit-desc').value.trim() || i.t;
                copy.d = form.querySelector('.exp-edit-date').value || i.d;
                copy.c = form.querySelector('.exp-edit-cat').value;
                copy.ils = parseFloat(form.querySelector('.exp-edit-ils').value) || i.ils;
                return copy;
            });
            state.editId = null;
            setItems(items);
        });
        form.querySelector('.exp-edit-del').addEventListener('click', function () {
            state.editId = null;
            setItems(state.items.filter(function (i) { return i.id !== tid; }));
        });
    }

    function render() {
        renderSummary();
        renderCatBars();
        renderDestRows();
        renderList();
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (typeof initMobileMenu === 'function') initMobileMenu();
        var dateEl = document.getElementById('expDate');
        if (dateEl) dateEl.value = todayStr();
        renderCurBtns();
        renderCatChips();
        loadRates();
        start();

        var amtEl = document.getElementById('expAmount');
        if (amtEl) amtEl.addEventListener('input', updateConvert);
        var addBtn = document.getElementById('expAddBtn');
        if (addBtn) addBtn.addEventListener('click', addExpense);
        var descEl = document.getElementById('expDesc');
        if (descEl) descEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') addExpense(); });
        var impBtn = document.getElementById('expImportBtn');
        if (impBtn) impBtn.addEventListener('click', importJson);
        var expBtn = document.getElementById('expExportBtn');
        if (expBtn) expBtn.addEventListener('click', exportJson);
        var csvBtn = document.getElementById('expCsvBtn');
        if (csvBtn) csvBtn.addEventListener('click', exportCsv);
    });

    document.addEventListener('tripdatachange', render);
})();
