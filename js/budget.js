(function () {
    'use strict';
    var DOC_ID = 'main';
    var LS_KEY = 'budget_main';

    /* EXAMPLE — one tab per country. `key` should match the country id in main.js. */
    var COUNTRIES = [
        { key: 'uluwatu', label: 'אולוואטו' },
        { key: 'rajaampat', label: 'ראג׳ה אמפט' },
        { key: 'sideman', label: 'סידמן' },
        { key: 'gili', label: 'גילי אייר' },
        { key: 'nusa', label: 'נוסה' },
        { key: 'munduk', label: 'מונדוק' },
        { key: 'ubud', label: 'אובוד' }
    ];
    var CATEGORIES = ['טיסות', 'לינה', 'אוכל', 'פעילויות', 'קניות', 'תחבורה', 'אחר'];

    var state = { items: [], tab: (COUNTRIES[0] && COUNTRIES[0].key) || '' };

    function id() { return 'b' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = String(s || '');
        return d.innerHTML;
    }

    /* ---- persistence ---- */
    function saveLs(items) {
        try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch (e) {}
    }

    function loadLs() {
        try { var r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : []; } catch (e) { return []; }
    }

    function saveFs(items) {
        if (typeof db === 'undefined' || !db) return;
        try {
            db.collection('budget').doc(DOC_ID).set({
                items: items,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(function (e) { console.warn('budget save', e); });
        } catch (e) {}
    }

    function setItems(items) {
        state.items = items;
        saveLs(items);
        saveFs(items);
        render();
    }

    function loadFs(cb) {
        if (typeof db === 'undefined' || !db) { cb(loadLs()); return; }
        try {
            db.collection('budget').doc(DOC_ID).onSnapshot(function (doc) {
                if (doc.exists && doc.data() && doc.data().items) {
                    cb(doc.data().items);
                } else {
                    var local = loadLs();
                    cb(local);
                    if (local.length) saveFs(local);
                }
            }, function (err) {
                console.warn('budget load', err);
                cb(loadLs());
            });
        } catch (e) { cb(loadLs()); }
    }

    /* ---- render ---- */
    function render() {
        renderTabs();
        renderTable();
        renderSummary();
    }

    function renderTabs() {
        var el = document.getElementById('budgetTabs');
        if (!el) return;
        el.innerHTML = COUNTRIES.map(function (c) {
            var active = c.key === state.tab ? ' active' : '';
            return '<button class="budget-tab' + active + '" data-c="' + c.key + '">' + esc(c.label) + '</button>';
        }).join('');
        el.querySelectorAll('.budget-tab').forEach(function (btn) {
            btn.addEventListener('click', function () {
                state.tab = btn.getAttribute('data-c');
                render();
            });
        });
    }

    function renderTable() {
        var el = document.getElementById('budgetBody');
        if (!el) return;
        var rows = state.items.filter(function (i) { return i.country === state.tab; });
        if (!rows.length) {
            el.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-muted)">אין עדיין פריטים. הוסף למטה.</td></tr>';
            return;
        }
        el.innerHTML = rows.map(function (item) {
            return '<tr data-id="' + esc(item.id) + '">' +
                '<td>' + esc(item.cat) + '</td>' +
                '<td>' + esc(item.label) + '</td>' +
                '<td><input type="number" class="budget-inp" data-f="planned" value="' + esc(item.planned || '') + '" placeholder="0" min="0"></td>' +
                '<td><input type="number" class="budget-inp" data-f="actual" value="' + esc(item.actual || '') + '" placeholder="0" min="0"></td>' +
                '<td><button type="button" class="budget-del" aria-label="מחיקה">×</button></td>' +
                '</tr>';
        }).join('');

        el.querySelectorAll('tr[data-id]').forEach(function (tr) {
            var tid = tr.getAttribute('data-id');
            tr.querySelectorAll('.budget-inp').forEach(function (inp) {
                inp.addEventListener('change', function () {
                    var field = inp.getAttribute('data-f');
                    var val = parseFloat(inp.value) || 0;
                    var items = state.items.map(function (i) {
                        if (i.id === tid) i[field] = val;
                        return i;
                    });
                    setItems(items);
                });
            });
            tr.querySelector('.budget-del').addEventListener('click', function () {
                setItems(state.items.filter(function (i) { return i.id !== tid; }));
            });
        });
    }

    function renderSummary() {
        var rows = state.items.filter(function (i) { return i.country === state.tab; });
        var planned = rows.reduce(function (s, i) { return s + (parseFloat(i.planned) || 0); }, 0);
        var actual = rows.reduce(function (s, i) { return s + (parseFloat(i.actual) || 0); }, 0);
        var diff = planned - actual;

        var pEl = document.getElementById('sumPlanned');
        var aEl = document.getElementById('sumActual');
        var dEl = document.getElementById('sumDiff');
        var dCard = document.getElementById('sumDiffCard');

        function fmt(n) { return n.toLocaleString('he-IL') + ' ₪'; }
        if (pEl) pEl.textContent = fmt(planned);
        if (aEl) aEl.textContent = fmt(actual);
        if (dEl) dEl.textContent = (diff >= 0 ? '+' : '') + fmt(diff);
        if (dCard) {
            dCard.classList.toggle('budget-over', diff < 0);
        }
    }

    function addItem() {
        var catEl = document.getElementById('addCat');
        var labelEl = document.getElementById('addLabel');
        var plannedEl = document.getElementById('addPlanned');
        if (!catEl || !labelEl) return;
        var label = (labelEl.value || '').trim();
        if (!label) return;
        labelEl.value = '';
        var items = state.items.slice();
        items.push({
            id: id(),
            country: state.tab,
            cat: catEl.value || 'אחר',
            label: label,
            planned: parseFloat(plannedEl.value) || 0,
            actual: 0
        });
        if (plannedEl) plannedEl.value = '';
        setItems(items);
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (typeof initMobileMenu === 'function') initMobileMenu();

        loadFs(function (items) {
            state.items = items;
            render();
        });

        var addBtn = document.getElementById('budgetAddBtn');
        var labelEl = document.getElementById('addLabel');
        if (addBtn) addBtn.addEventListener('click', addItem);
        if (labelEl) labelEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') addItem(); });
    });
})();
