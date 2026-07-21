/* יומן המסע — a narrative travel journal, written per destination or per day.

   Deliberately NOT the timeline: the timeline answers "what's the plan for
   this day", the diary answers "what did this place feel like". So it has no
   times, no ordering to maintain and no structure to fill in — just a mood, a
   writer, and free text, with rotating prompts for when you're staring at an
   empty box.

   TWO SURFACES, ONE STORE. A destination page shows the full diary at the
   bottom; opening a day in the rail shows that day's entries under its
   timeline. Both read and write the SAME Firestore doc (diary/<countryId>) —
   an entry written from a day just carries a dayDocId tag. That keeps one
   listener per page instead of one per day, and means the destination page
   can tell the whole story of a place, day entries included, in one scroll.

   Persistence follows the pattern in js/todo.js: localStorage first (works with
   no setup at all), Firestore too when js/firebase-config.js holds real values.
   Firestore collection: 'diary'. */
(function () {
    'use strict';

    var LS_PREFIX = 'diary_';
    var COLLECTION = 'diary';

    var AUTHORS = [
        { key: 'guy', label: 'גיא', emoji: '🌊' },
        { key: 'adi', label: 'עדי', emoji: '🌸' },
        { key: 'both', label: 'שנינו', emoji: '💞' }
    ];

    var MOODS = ['😍', '🤩', '😌', '🥹', '😂', '🤯', '😴', '🌅', '🌊', '🍜', '🛵', '💦'];

    /* Prompts are the whole point of the feature — an empty textarea gets
       nothing written in it, a question gets answered. */
    var PROMPTS = [
        'מה הדבר הראשון שקפץ לעיניים כשהגענו?',
        'הרגע שנרצה לזכור מהיום הזה בעוד 20 שנה…',
        'הטעם הכי טוב שטעמנו כאן היה…',
        'מה הפתיע אתכם היום — לטובה או לרעה?',
        'איזה ריח או צליל הכי מזוהה עם המקום הזה?',
        'משהו מצחיק שקרה לנו היום',
        'מישהו שפגשנו ולא נשכח',
        'מה היינו אומרים לזוג שמגיע לכאן מחר?',
        'הרגע הכי רגוע של היום',
        'משהו שיצאנו ממנו אחרים',
        'הטעות הכי משתלמת שעשינו כאן',
        'איך נראתה השקיעה מכאן?',
        'מה הכי התגעגענו אליו מהבית — ומה בכלל לא?',
        'התמונה שלא הספקנו לצלם',
        'אם היה אפשר להישאר כאן עוד יום אחד, מה היינו עושים?'
    ];

    /* One store per page — whichever destination this page is showing. */
    var store = { countryId: '', countryName: '', entries: [], unsub: null };

    /* Every mounted surface (destination section and/or an open day panel).
       Each keeps its own composer draft so typing in one doesn't disturb the
       other. */
    var views = [];

    function esc(s) {
        if (s == null) return '';
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function uid() {
        return 'd' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    }

    function todayISO() {
        var d = new Date();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        return d.getFullYear() + '-' + m + '-' + day;
    }

    function prettyDate(iso) {
        if (!iso) return '';
        var parts = String(iso).split('-');
        if (parts.length !== 3) return iso;
        var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (isNaN(d.getTime())) return iso;
        try {
            return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) {
            return parts[2] + '.' + parts[1] + '.' + parts[0];
        }
    }

    function authorMeta(key) {
        for (var i = 0; i < AUTHORS.length; i++) {
            if (AUTHORS[i].key === key) return AUTHORS[i];
        }
        return AUTHORS[2];
    }

    function resolveName(id, fallback) {
        if (fallback) return fallback;
        try {
            var c = (tripData.countries || []).find(function (x) { return x.id === id; });
            return c ? c.name : '';
        } catch (e) { return ''; }
    }

    /* ---------- persistence ---------- */

    function loadLocal(countryId) {
        try {
            var raw = localStorage.getItem(LS_PREFIX + countryId);
            var v = raw ? JSON.parse(raw) : [];
            return Array.isArray(v) ? v : [];
        } catch (e) { return []; }
    }

    function saveLocal(countryId, list) {
        try {
            localStorage.setItem(LS_PREFIX + countryId, JSON.stringify(list || []));
        } catch (e) {}
    }

    function saveRemote(countryId, list) {
        if (typeof db === 'undefined' || !db || !countryId) return;
        try {
            db.collection(COLLECTION).doc(countryId).set({
                entries: list,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(function (err) { console.warn('Diary save error', err); });
        } catch (e) {}
    }

    function persist() {
        saveLocal(store.countryId, store.entries);
        saveRemote(store.countryId, store.entries);
    }

    function subscribe() {
        if (store.unsub) { try { store.unsub(); } catch (e) {} store.unsub = null; }
        if (typeof db === 'undefined' || !db) return;
        var countryId = store.countryId;
        try {
            store.unsub = db.collection(COLLECTION).doc(countryId).onSnapshot(function (doc) {
                /* A late snapshot for a destination we've navigated away from
                   must not clobber the current one. */
                if (store.countryId !== countryId) return;
                var remote = [];
                if (doc.exists) {
                    var d = doc.data();
                    if (d && Array.isArray(d.entries)) remote = d.entries;
                }
                if (remote.length) {
                    store.entries = remote;
                    saveLocal(countryId, remote);
                } else if (store.entries.length) {
                    /* First device to write seeds the doc — same as todo.js. */
                    saveRemote(countryId, store.entries);
                }
                renderAll();
            }, function (err) {
                console.warn('Firestore diary error', err);
            });
        } catch (e) {}
    }

    /* Points the page's single store at a destination, loading and subscribing
       only when it actually changes (both surfaces call this). */
    function useCountry(countryId, name) {
        if (store.countryId === countryId) {
            if (name && !store.countryName) store.countryName = name;
            return;
        }
        store.countryId = countryId;
        store.countryName = resolveName(countryId, name);
        store.entries = loadLocal(countryId);
        subscribe();
    }

    /* ---------- view helpers ---------- */

    function randomPrompt(current) {
        var pool = PROMPTS.filter(function (p) { return p !== current; });
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function entriesFor(view) {
        var list = store.entries.slice();
        if (view.dayDocId) {
            list = list.filter(function (e) { return e.dayDocId === view.dayDocId; });
        }
        return list.sort(function (a, b) {
            var d = String(b.date || '').localeCompare(String(a.date || ''));
            if (d !== 0) return d;
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
    }

    function renderAll() {
        /* Day panels are torn out of the DOM whenever the detail pane closes. */
        views = views.filter(function (v) { return document.body.contains(v.root); });
        views.forEach(renderView);
    }

    function renderView(view) {
        renderComposer(view);
        renderEntries(view);
    }

    /* ---------- composer ---------- */

    function renderComposer(view) {
        var mount = view.root.querySelector('.diary-composer-mount');
        if (!mount) return;
        var d = view.draft;

        var authorBtns = AUTHORS.map(function (a) {
            var on = a.key === d.author;
            return '<button type="button" class="diary-author-btn diary-author-btn--' + a.key +
                (on ? ' is-active' : '') + '" data-author="' + a.key + '" aria-pressed="' + on + '">' +
                '<span aria-hidden="true">' + a.emoji + '</span> ' + esc(a.label) + '</button>';
        }).join('');

        var moodBtns = MOODS.map(function (m) {
            var on = m === d.mood;
            return '<button type="button" class="diary-mood-btn' + (on ? ' is-active' : '') +
                '" data-mood="' + m + '" aria-pressed="' + on + '" aria-label="תחושה ' + m + '">' + m + '</button>';
        }).join('');

        var placeholder = view.dayDocId
            ? 'מה קרה היום? איך זה הרגיש? כתבו בזמן שזה טרי…'
            : 'כתבו איך היה כאן — בלי לחשוב יותר מדי, בשביל שיהיה כיף לקרוא את זה בעוד שנים…';

        mount.innerHTML =
            '<div class="diary-composer' + (view.editingId ? ' is-editing' : '') +
            (view.dayDocId ? ' diary-composer--day' : '') + '">' +
            '<div class="diary-composer__row diary-composer__row--who">' +
            '<span class="diary-composer__label">מי כותב?</span>' +
            '<div class="diary-authors">' + authorBtns + '</div>' +
            '</div>' +

            '<div class="diary-prompt' + (d.prompt ? ' is-filled' : '') + '">' +
            '<span class="diary-prompt__text">' +
            (d.prompt ? esc(d.prompt) : 'אין לכם מושג מאיפה להתחיל? קבלו שאלה 👈') +
            '</span>' +
            '<button type="button" class="diary-prompt__btn">🎲 תנו לי שאלה</button>' +
            (d.prompt ? '<button type="button" class="diary-prompt__clear" aria-label="ביטול השאלה">✕</button>' : '') +
            '</div>' +

            '<textarea class="diary-textarea" rows="' + (view.dayDocId ? 4 : 5) + '" ' +
            'placeholder="' + placeholder + '"></textarea>' +

            '<div class="diary-composer__row diary-composer__row--mood">' +
            '<span class="diary-composer__label">התחושה של הרגע</span>' +
            '<div class="diary-moods">' + moodBtns + '</div>' +
            '</div>' +

            '<div class="diary-composer__actions">' +
            '<input type="date" class="diary-date" aria-label="תאריך הרשומה" value="' +
            esc(view.defaultDate || todayISO()) + '">' +
            '<div class="diary-composer__buttons">' +
            (view.editingId ? '<button type="button" class="diary-cancel-btn">ביטול</button>' : '') +
            '<button type="button" class="diary-save-btn">' +
            (view.editingId ? '💾 עדכון הרשומה' : '✍️ הוספה ליומן') + '</button>' +
            '</div>' +
            '</div>' +
            '</div>';

        bindComposer(view, mount);
    }

    /* Re-renders the composer while keeping whatever is already typed. */
    function refreshComposer(view) {
        var mount = view.root.querySelector('.diary-composer-mount');
        var ta = mount && mount.querySelector('.diary-textarea');
        var dateEl = mount && mount.querySelector('.diary-date');
        var text = ta ? ta.value : '';
        var date = dateEl ? dateEl.value : '';
        renderComposer(view);
        setComposerFields(view, text, date);
    }

    function setComposerFields(view, text, date) {
        var mount = view.root.querySelector('.diary-composer-mount');
        if (!mount) return;
        var ta = mount.querySelector('.diary-textarea');
        if (ta && text) ta.value = text;
        var dateEl = mount.querySelector('.diary-date');
        if (dateEl && date) dateEl.value = date;
    }

    function bindComposer(view, mount) {
        mount.querySelectorAll('.diary-author-btn').forEach(function (b) {
            b.addEventListener('click', function () {
                view.draft.author = b.dataset.author;
                refreshComposer(view);
            });
        });

        mount.querySelectorAll('.diary-mood-btn').forEach(function (b) {
            b.addEventListener('click', function () {
                /* Tapping the active mood clears it — moods are optional. */
                view.draft.mood = (view.draft.mood === b.dataset.mood) ? '' : b.dataset.mood;
                refreshComposer(view);
            });
        });

        var promptBtn = mount.querySelector('.diary-prompt__btn');
        if (promptBtn) {
            promptBtn.addEventListener('click', function () {
                view.draft.prompt = randomPrompt(view.draft.prompt);
                refreshComposer(view);
                var ta = mount.querySelector('.diary-textarea');
                if (ta) ta.focus();
            });
        }

        var promptClear = mount.querySelector('.diary-prompt__clear');
        if (promptClear) {
            promptClear.addEventListener('click', function () {
                view.draft.prompt = '';
                refreshComposer(view);
            });
        }

        var saveBtn = mount.querySelector('.diary-save-btn');
        if (saveBtn) saveBtn.addEventListener('click', function () { saveEntry(view); });

        var cancelBtn = mount.querySelector('.diary-cancel-btn');
        if (cancelBtn) cancelBtn.addEventListener('click', function () { resetComposer(view); });

        var ta = mount.querySelector('.diary-textarea');
        if (ta) {
            /* Ctrl/Cmd+Enter saves — the textarea is multi-line so plain Enter
               has to keep making paragraphs. */
            ta.addEventListener('keydown', function (e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    saveEntry(view);
                }
            });
        }
    }

    function saveEntry(view) {
        var mount = view.root.querySelector('.diary-composer-mount');
        var ta = mount.querySelector('.diary-textarea');
        var dateEl = mount.querySelector('.diary-date');
        var text = ta ? ta.value.trim() : '';
        if (!text) { if (ta) ta.focus(); return; }

        if (view.editingId) {
            var editing = view.editingId;
            store.entries = store.entries.map(function (e) {
                if (e.id !== editing) return e;
                return {
                    id: e.id,
                    author: view.draft.author,
                    mood: view.draft.mood,
                    prompt: view.draft.prompt,
                    text: text,
                    date: dateEl ? dateEl.value : e.date,
                    /* Keep the entry attached to whichever day it was written
                       for, even when edited from the destination view. */
                    dayDocId: e.dayDocId || null,
                    dayLabel: e.dayLabel || '',
                    createdAt: e.createdAt,
                    editedAt: Date.now()
                };
            });
        } else {
            store.entries.push({
                id: uid(),
                author: view.draft.author,
                mood: view.draft.mood,
                prompt: view.draft.prompt,
                text: text,
                date: dateEl ? dateEl.value : todayISO(),
                dayDocId: view.dayDocId || null,
                dayLabel: view.dayLabel || '',
                createdAt: Date.now()
            });
        }

        persist();
        resetComposer(view);
        renderAll();
    }

    function resetComposer(view) {
        view.editingId = null;
        view.draft.mood = '';
        view.draft.prompt = '';
        renderComposer(view);
    }

    function startEdit(view, id) {
        var entry = store.entries.find(function (e) { return e.id === id; });
        if (!entry) return;
        view.editingId = id;
        view.draft.author = entry.author || 'both';
        view.draft.mood = entry.mood || '';
        view.draft.prompt = entry.prompt || '';
        renderComposer(view);
        setComposerFields(view, entry.text, entry.date);
        var ta = view.root.querySelector('.diary-textarea');
        if (ta) {
            ta.focus();
            ta.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }

    function deleteEntry(id) {
        var entry = store.entries.find(function (e) { return e.id === id; });
        if (!entry) return;
        if (!confirm('למחוק את הרשומה הזו מהיומן? אי אפשר לשחזר.')) return;
        store.entries = store.entries.filter(function (e) { return e.id !== id; });
        views.forEach(function (v) { if (v.editingId === id) resetComposer(v); });
        persist();
        renderAll();
    }

    /* ---------- entry list ---------- */

    function renderEntries(view) {
        var mount = view.root.querySelector('.diary-entries');
        if (!mount) return;
        var list = entriesFor(view);

        var countEl = view.root.querySelector('.diary-count');
        if (countEl) {
            countEl.textContent = !list.length ? ''
                : (list.length === 1 ? 'רשומה אחת' : list.length + ' רשומות');
        }

        if (!list.length) {
            mount.innerHTML = view.dayDocId
                ? '<div class="diary-empty diary-empty--day">' +
                  '<p class="diary-empty__text">עוד לא כתבתם על היום הזה. אפילו שתי שורות שוות.</p>' +
                  '</div>'
                : '<div class="diary-empty">' +
                  '<div class="diary-empty__icon" aria-hidden="true">📖</div>' +
                  '<p class="diary-empty__title">היומן של ' + esc(store.countryName || 'היעד') + ' עוד ריק</p>' +
                  '<p class="diary-empty__text">שורה אחת ביום מספיקה. בעוד כמה שנים זה יהיה הדבר הכי שווה באתר הזה.</p>' +
                  '</div>';
            return;
        }

        mount.innerHTML = list.map(function (e) {
            var a = authorMeta(e.author);
            /* The day badge only means something in the destination view — in a
               day panel every entry is from that day by definition. */
            var dayBadge = (!view.dayDocId && e.dayLabel)
                ? '<span class="diary-entry__day">' + esc(e.dayLabel) + '</span>' : '';
            return (
                '<article class="diary-entry diary-entry--' + a.key + '" data-id="' + esc(e.id) + '">' +
                '<header class="diary-entry__head">' +
                '<span class="diary-entry__author"><span aria-hidden="true">' + a.emoji + '</span> ' + esc(a.label) + '</span>' +
                '<span class="diary-entry__date">' + esc(prettyDate(e.date)) + '</span>' +
                dayBadge +
                (e.mood ? '<span class="diary-entry__mood" aria-label="תחושה">' + esc(e.mood) + '</span>' : '') +
                '<span class="diary-entry__actions">' +
                '<button type="button" class="diary-entry__btn" data-act="edit" aria-label="עריכת הרשומה">✏️</button>' +
                '<button type="button" class="diary-entry__btn" data-act="delete" aria-label="מחיקת הרשומה">🗑️</button>' +
                '</span>' +
                '</header>' +
                (e.prompt ? '<p class="diary-entry__prompt">' + esc(e.prompt) + '</p>' : '') +
                '<div class="diary-entry__text">' + esc(e.text).replace(/\n/g, '<br>') + '</div>' +
                (e.editedAt ? '<p class="diary-entry__edited">נערך</p>' : '') +
                '</article>'
            );
        }).join('');
    }

    function bindList(view) {
        var list = view.root.querySelector('.diary-entries');
        if (!list) return;
        list.addEventListener('click', function (ev) {
            var btn = ev.target.closest('.diary-entry__btn');
            if (!btn) return;
            var entry = btn.closest('.diary-entry');
            if (!entry) return;
            var id = entry.getAttribute('data-id');
            if (btn.dataset.act === 'edit') startEdit(view, id);
            else deleteEntry(id);
        });
    }

    function makeView(root, opts) {
        var view = {
            root: root,
            dayDocId: (opts && opts.dayDocId) || null,
            dayLabel: (opts && opts.dayLabel) || '',
            defaultDate: (opts && opts.defaultDate) || todayISO(),
            draft: { author: 'both', mood: '', prompt: '' },
            editingId: null
        };
        /* One view per root: a day panel is rebuilt every time it opens. */
        views = views.filter(function (v) { return v.root !== root && document.body.contains(v.root); });
        views.push(view);
        bindList(view);
        renderView(view);
        return view;
    }

    /* ---------- public entry points ---------- */

    /* Destination page: the full diary for this place, day entries included. */
    function initDiary(countryId, name) {
        var mount = document.getElementById('diarySection');
        if (!mount) return;
        useCountry(countryId, name);

        mount.innerHTML =
            '<div class="diary-header">' +
            '<h2>📖 יומן המסע — ' + esc(store.countryName || '') + '</h2>' +
            '<span class="diary-count"></span>' +
            '</div>' +
            '<p class="diary-intro">לא לו״ז ולא תכנון — פשוט איך היה. כאן מרוכזות גם הרשומות שכתבתם בתוך ימים ספציפיים.</p>' +
            '<div class="diary-composer-mount"></div>' +
            '<div class="diary-entries"></div>';

        makeView(mount, {});
    }

    /* Day detail (country page rail, and pages/day.html): just this day. */
    function initDayDiaryPanel(docId, countryId, dayLabel, dayDate) {
        var mount = document.getElementById('dayDiaryMount');
        if (!mount || !docId || !countryId) return;
        useCountry(countryId);

        mount.innerHTML =
            '<div class="diary-header diary-header--day">' +
            '<h2>📖 יומן היום</h2>' +
            '<span class="diary-count"></span>' +
            '</div>' +
            '<p class="diary-intro diary-intro--day">איך היה היום הזה באמת — הרשומות יופיעו גם ביומן של היעד למטה.</p>' +
            '<div class="diary-composer-mount"></div>' +
            '<div class="diary-entries"></div>';

        makeView(mount, { dayDocId: docId, dayLabel: dayLabel || '', defaultDate: dayDate || todayISO() });
    }

    window.initDiary = initDiary;
    window.initDayDiaryPanel = initDayDiaryPanel;
})();
