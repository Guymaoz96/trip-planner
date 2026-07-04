(function () {
    'use strict';
    var DOC_ID = 'main';
    var LS_KEY = 'packing_main';

    var CATEGORIES = ['ביגוד', 'מסמכים', 'גלישה', 'היגיינה', 'אלקטרוניקה', 'תרופות', 'כללי'];

    var DEFAULT_ITEMS = [
        { cat: 'מסמכים', text: 'דרכון (בתוקף לפחות 6 חודשים)' },
        { cat: 'מסמכים', text: 'ביטוח נסיעות' },
        { cat: 'מסמכים', text: 'כרטיסי טיסה (הדפסה / דיגיטל)' },
        { cat: 'מסמכים', text: 'רישיון נהיגה בינלאומי' },
        { cat: 'מסמכים', text: 'הזמנות מלון ורכב' },
        { cat: 'ביגוד', text: 'חולצות (7+)' },
        { cat: 'ביגוד', text: 'מכנסיים / ג׳ינס (3)' },
        { cat: 'ביגוד', text: 'שורט (4)' },
        { cat: 'ביגוד', text: 'בגד ים (2)' },
        { cat: 'ביגוד', text: 'נעלי ספורט' },
        { cat: 'ביגוד', text: 'כפכפים / נעלי ים' },
        { cat: 'ביגוד', text: 'גרביים (7+)' },
        { cat: 'ביגוד', text: 'מעיל קל / חולצה ארוכה לערבים' },
        { cat: 'גלישה', text: 'לוח גלישה (shortboard)' },
        { cat: 'גלישה', text: 'חליפת גלישה' },
        { cat: 'גלישה', text: 'שעוות לוח' },
        { cat: 'גלישה', text: 'חגורת רגל (leash)' },
        { cat: 'היגיינה', text: 'קרם הגנה SPF 50+' },
        { cat: 'היגיינה', text: 'שמפו ומרכך' },
        { cat: 'היגיינה', text: 'מברשת שיניים ומשחה' },
        { cat: 'היגיינה', text: 'מגבת חוף' },
        { cat: 'היגיינה', text: 'חרקים / ספריי דוחה יתושים' },
        { cat: 'אלקטרוניקה', text: 'מטען טלפון + כבל' },
        { cat: 'אלקטרוניקה', text: 'מתאם חשמל (אפריקה: type C/M)' },
        { cat: 'אלקטרוניקה', text: 'Power bank' },
        { cat: 'אלקטרוניקה', text: 'מצלמה / GoPro' },
        { cat: 'אלקטרוניקה', text: 'אוזניות' },
        { cat: 'תרופות', text: 'תרופות אישיות קבועות' },
        { cat: 'תרופות', text: 'תרופה לשלשול / קיבה' },
        { cat: 'תרופות', text: 'אנטיביוטיקה רחב-טווח (ייעוץ רופא)' },
        { cat: 'תרופות', text: 'משכך כאבים (אקמול / אדוויל)' },
        { cat: 'תרופות', text: 'פלסטרים + חבישה בסיסית' },
        { cat: 'כללי', text: 'מזוודה / תרמיל' },
        { cat: 'כללי', text: 'כסף מזומן (אירו + ראנד + דולר)' },
        { cat: 'כללי', text: 'נעלי בית' },
    ];

    var state = { items: [], filter: 'הכל' };

    function id() { return 't' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = s || '';
        return d.innerHTML;
    }

    /* ---- persistence ---- */
    function saveLs(items) {
        try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch (e) {}
    }

    function loadLs() {
        try { var r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; }
    }

    function saveFs(items) {
        if (typeof db === 'undefined' || !db) return;
        try {
            db.collection('packing').doc(DOC_ID).set({
                items: items,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(function (e) { console.warn('packing save', e); });
        } catch (e) {}
    }

    function setItems(items) {
        state.items = items;
        saveLs(items);
        saveFs(items);
        render();
    }

    function loadFs(cb) {
        if (typeof db === 'undefined' || !db) { cb(loadLs() || makeDefaults()); return; }
        try {
            db.collection('packing').doc(DOC_ID).onSnapshot(function (doc) {
                if (doc.exists && doc.data() && doc.data().items && doc.data().items.length) {
                    cb(doc.data().items);
                } else {
                    var local = loadLs();
                    var items = local && local.length ? local : makeDefaults();
                    cb(items);
                    saveFs(items);
                }
            }, function (err) {
                console.warn('packing load', err);
                cb(loadLs() || makeDefaults());
            });
        } catch (e) {
            cb(loadLs() || makeDefaults());
        }
    }

    function makeDefaults() {
        return DEFAULT_ITEMS.map(function (d) {
            return { id: id(), text: d.text, cat: d.cat, done: false };
        });
    }

    /* ---- render ---- */
    function render() {
        renderProgress();
        renderFilters();
        renderItems();
    }

    function renderProgress() {
        var total = state.items.length;
        var done = state.items.filter(function (i) { return i.done; }).length;
        var pct = total ? Math.round((done / total) * 100) : 0;
        var el = document.getElementById('packingProgress');
        if (!el) return;
        el.innerHTML = '<span>' + done + '/' + total + ' פריטים (' + pct + '%)</span>' +
            '<div class="pk-bar"><div class="pk-fill" style="width:' + pct + '%"></div></div>';
    }

    function renderFilters() {
        var el = document.getElementById('packingFilters');
        if (!el) return;
        var filters = ['הכל'].concat(CATEGORIES);
        el.innerHTML = filters.map(function (f) {
            var active = f === state.filter ? ' active' : '';
            return '<button class="filter-chip' + active + '" data-f="' + esc(f) + '">' + esc(f) + '</button>';
        }).join('');
        el.querySelectorAll('.filter-chip').forEach(function (btn) {
            btn.addEventListener('click', function () {
                state.filter = btn.getAttribute('data-f');
                render();
            });
        });
    }

    function renderItems() {
        var el = document.getElementById('packingList');
        if (!el) return;
        var filtered = state.filter === 'הכל'
            ? state.items
            : state.items.filter(function (i) { return i.cat === state.filter; });

        if (!filtered.length) {
            el.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:1.5rem">אין פריטים בקטגוריה זו</p>';
            return;
        }

        var groups = {};
        filtered.forEach(function (item) {
            if (!groups[item.cat]) groups[item.cat] = [];
            groups[item.cat].push(item);
        });

        var html = '';
        CATEGORIES.forEach(function (cat) {
            if (!groups[cat]) return;
            html += '<div class="pk-group"><div class="pk-group-title">' + esc(cat) + '</div><ul class="todo-list">';
            groups[cat].forEach(function (item) {
                var done = item.done ? ' done' : '';
                html += '<li class="todo-item' + done + '" data-id="' + esc(item.id) + '">' +
                    '<span class="todo-main" role="button" tabindex="0" aria-pressed="' + (item.done ? 'true' : 'false') + '">' +
                    '<span class="todo-check" aria-hidden="true">' + (item.done ? '✓' : '') + '</span>' +
                    '<span class="todo-text">' + esc(item.text) + '</span>' +
                    '</span>' +
                    '<button type="button" class="todo-delete" aria-label="מחיקה">×</button>' +
                    '</li>';
            });
            html += '</ul></div>';
        });
        el.innerHTML = html;

        el.querySelectorAll('.todo-item').forEach(function (li) {
            var tid = li.getAttribute('data-id');
            li.querySelector('.todo-main').addEventListener('click', function () { toggleItem(tid); });
            li.querySelector('.todo-main').addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleItem(tid); }
            });
            li.querySelector('.todo-delete').addEventListener('click', function (e) {
                e.stopPropagation(); deleteItem(tid);
            });
        });
    }

    function toggleItem(tid) {
        var items = state.items.map(function (i) {
            if (i.id === tid) i.done = !i.done;
            return i;
        });
        setItems(items);
    }

    function deleteItem(tid) {
        setItems(state.items.filter(function (i) { return i.id !== tid; }));
    }

    function addItem() {
        var textEl = document.getElementById('packingInput');
        var catEl = document.getElementById('packingCat');
        if (!textEl || !catEl) return;
        var text = (textEl.value || '').trim();
        var cat = catEl.value || 'כללי';
        if (!text) return;
        textEl.value = '';
        var items = state.items.slice();
        items.push({ id: id(), text: text, cat: cat, done: false });
        setItems(items);
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (typeof initMobileMenu === 'function') initMobileMenu();

        loadFs(function (items) {
            state.items = items;
            render();
        });

        var addBtn = document.getElementById('packingAddBtn');
        var inp = document.getElementById('packingInput');
        if (addBtn) addBtn.addEventListener('click', addItem);
        if (inp) inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') addItem(); });
    });
})();
