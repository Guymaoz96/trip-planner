/* יומן המסע — a narrative, per-destination travel journal.

   Deliberately NOT the timeline: the timeline answers "what's the plan for
   this day", the diary answers "what did this place feel like". So it has no
   times, no ordering to maintain and no structure to fill in — just a mood, a
   writer, and free text, with rotating prompts for when you're staring at an
   empty box.

   Persistence follows the pattern in js/todo.js: localStorage first (works with
   no setup at all), Firestore too when js/firebase-config.js holds real values.
   Firestore collection: 'diary' (one doc per destination id). */
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

    var countryId = '';
    var countryName = '';
    var entries = [];
    var draft = { author: 'both', mood: '', prompt: '' };
    var editingId = null;

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

    /* ---------- persistence ---------- */

    function loadLocal() {
        try {
            var raw = localStorage.getItem(LS_PREFIX + countryId);
            var v = raw ? JSON.parse(raw) : [];
            return Array.isArray(v) ? v : [];
        } catch (e) { return []; }
    }

    function saveLocal(list) {
        try {
            localStorage.setItem(LS_PREFIX + countryId, JSON.stringify(list || []));
        } catch (e) {}
    }

    function saveRemote(list) {
        if (typeof db === 'undefined' || !db) return;
        try {
            db.collection(COLLECTION).doc(countryId).set({
                entries: list,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(function (err) { console.warn('Diary save error', err); });
        } catch (e) {}
    }

    function persist() {
        saveLocal(entries);
        saveRemote(entries);
    }

    function subscribe() {
        if (typeof db === 'undefined' || !db) {
            entries = loadLocal();
            renderEntries();
            return;
        }
        try {
            db.collection(COLLECTION).doc(countryId).onSnapshot(function (doc) {
                var remote = [];
                if (doc.exists) {
                    var d = doc.data();
                    if (d && Array.isArray(d.entries)) remote = d.entries;
                }
                if (remote.length) {
                    entries = remote;
                } else {
                    var local = loadLocal();
                    entries = local;
                    /* First device to write wins the seed — same as todo.js. */
                    if (local.length) saveRemote(local);
                }
                renderEntries();
            }, function (err) {
                console.warn('Firestore diary error', err);
                entries = loadLocal();
                renderEntries();
            });
        } catch (e) {
            entries = loadLocal();
            renderEntries();
        }
    }

    /* ---------- rendering ---------- */

    function randomPrompt() {
        var pool = PROMPTS.filter(function (p) { return p !== draft.prompt; });
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function renderComposer() {
        var mount = document.getElementById('diaryComposer');
        if (!mount) return;

        var authorBtns = AUTHORS.map(function (a) {
            var on = a.key === draft.author;
            return '<button type="button" class="diary-author-btn diary-author-btn--' + a.key +
                (on ? ' is-active' : '') + '" data-author="' + a.key + '" aria-pressed="' + on + '">' +
                '<span aria-hidden="true">' + a.emoji + '</span> ' + esc(a.label) + '</button>';
        }).join('');

        var moodBtns = MOODS.map(function (m) {
            var on = m === draft.mood;
            return '<button type="button" class="diary-mood-btn' + (on ? ' is-active' : '') +
                '" data-mood="' + m + '" aria-pressed="' + on + '" aria-label="תחושה ' + m + '">' + m + '</button>';
        }).join('');

        mount.innerHTML =
            '<div class="diary-composer' + (editingId ? ' is-editing' : '') + '">' +
            '<div class="diary-composer__row diary-composer__row--who">' +
            '<span class="diary-composer__label">מי כותב?</span>' +
            '<div class="diary-authors">' + authorBtns + '</div>' +
            '</div>' +

            '<div class="diary-prompt' + (draft.prompt ? ' is-filled' : '') + '" id="diaryPrompt">' +
            '<span class="diary-prompt__text" id="diaryPromptText">' +
            (draft.prompt ? esc(draft.prompt) : 'אין לכם מושג מאיפה להתחיל? קבלו שאלה 👈') +
            '</span>' +
            '<button type="button" class="diary-prompt__btn" id="diaryPromptBtn">🎲 תנו לי שאלה</button>' +
            (draft.prompt ? '<button type="button" class="diary-prompt__clear" id="diaryPromptClear" aria-label="ביטול השאלה">✕</button>' : '') +
            '</div>' +

            '<textarea id="diaryText" class="diary-textarea" rows="5" ' +
            'placeholder="כתבו איך היה כאן — בלי לחשוב יותר מדי, בשביל שיהיה כיף לקרוא את זה בעוד שנים…"></textarea>' +

            '<div class="diary-composer__row diary-composer__row--mood">' +
            '<span class="diary-composer__label">התחושה של הרגע</span>' +
            '<div class="diary-moods">' + moodBtns + '</div>' +
            '</div>' +

            '<div class="diary-composer__actions">' +
            '<input type="date" id="diaryDate" class="diary-date" aria-label="תאריך הרשומה" value="' + todayISO() + '">' +
            '<div class="diary-composer__buttons">' +
            (editingId ? '<button type="button" class="diary-cancel-btn" id="diaryCancelBtn">ביטול</button>' : '') +
            '<button type="button" class="diary-save-btn" id="diarySaveBtn">' +
            (editingId ? '💾 עדכון הרשומה' : '✍️ הוספה ליומן') + '</button>' +
            '</div>' +
            '</div>' +
            '</div>';

        bindComposer();
    }

    function bindComposer() {
        var mount = document.getElementById('diaryComposer');
        if (!mount) return;

        mount.querySelectorAll('.diary-author-btn').forEach(function (b) {
            b.addEventListener('click', function () {
                draft.author = b.dataset.author;
                var text = document.getElementById('diaryText');
                var keep = text ? text.value : '';
                var date = document.getElementById('diaryDate');
                var keepDate = date ? date.value : '';
                renderComposer();
                restoreDraftFields(keep, keepDate);
            });
        });

        mount.querySelectorAll('.diary-mood-btn').forEach(function (b) {
            b.addEventListener('click', function () {
                /* Tapping the active mood clears it — moods are optional. */
                draft.mood = (draft.mood === b.dataset.mood) ? '' : b.dataset.mood;
                var text = document.getElementById('diaryText');
                var keep = text ? text.value : '';
                var date = document.getElementById('diaryDate');
                var keepDate = date ? date.value : '';
                renderComposer();
                restoreDraftFields(keep, keepDate);
            });
        });

        var promptBtn = document.getElementById('diaryPromptBtn');
        if (promptBtn) {
            promptBtn.addEventListener('click', function () {
                draft.prompt = randomPrompt();
                var text = document.getElementById('diaryText');
                var keep = text ? text.value : '';
                var date = document.getElementById('diaryDate');
                var keepDate = date ? date.value : '';
                renderComposer();
                restoreDraftFields(keep, keepDate);
                var ta = document.getElementById('diaryText');
                if (ta) ta.focus();
            });
        }

        var promptClear = document.getElementById('diaryPromptClear');
        if (promptClear) {
            promptClear.addEventListener('click', function () {
                draft.prompt = '';
                var text = document.getElementById('diaryText');
                var keep = text ? text.value : '';
                var date = document.getElementById('diaryDate');
                var keepDate = date ? date.value : '';
                renderComposer();
                restoreDraftFields(keep, keepDate);
            });
        }

        var saveBtn = document.getElementById('diarySaveBtn');
        if (saveBtn) saveBtn.addEventListener('click', saveEntry);

        var cancelBtn = document.getElementById('diaryCancelBtn');
        if (cancelBtn) cancelBtn.addEventListener('click', resetComposer);

        var ta = document.getElementById('diaryText');
        if (ta) {
            /* Ctrl/Cmd+Enter saves — the textarea is multi-line so plain Enter
               has to keep making paragraphs. */
            ta.addEventListener('keydown', function (e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    saveEntry();
                }
            });
        }
    }

    function restoreDraftFields(text, date) {
        var ta = document.getElementById('diaryText');
        if (ta && text) ta.value = text;
        var d = document.getElementById('diaryDate');
        if (d && date) d.value = date;
    }

    function saveEntry() {
        var ta = document.getElementById('diaryText');
        var dateEl = document.getElementById('diaryDate');
        var text = ta ? ta.value.trim() : '';
        if (!text) {
            if (ta) ta.focus();
            return;
        }

        if (editingId) {
            entries = entries.map(function (e) {
                if (e.id !== editingId) return e;
                return {
                    id: e.id,
                    author: draft.author,
                    mood: draft.mood,
                    prompt: draft.prompt,
                    text: text,
                    date: dateEl ? dateEl.value : e.date,
                    createdAt: e.createdAt,
                    editedAt: Date.now()
                };
            });
        } else {
            entries.push({
                id: uid(),
                author: draft.author,
                mood: draft.mood,
                prompt: draft.prompt,
                text: text,
                date: dateEl ? dateEl.value : todayISO(),
                createdAt: Date.now()
            });
        }

        persist();
        resetComposer();
        renderEntries();
    }

    function resetComposer() {
        editingId = null;
        draft.mood = '';
        draft.prompt = '';
        renderComposer();
    }

    function startEdit(id) {
        var entry = entries.find(function (e) { return e.id === id; });
        if (!entry) return;
        editingId = id;
        draft.author = entry.author || 'both';
        draft.mood = entry.mood || '';
        draft.prompt = entry.prompt || '';
        renderComposer();
        restoreDraftFields(entry.text, entry.date);
        var ta = document.getElementById('diaryText');
        if (ta) {
            ta.focus();
            ta.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }

    function deleteEntry(id) {
        var entry = entries.find(function (e) { return e.id === id; });
        if (!entry) return;
        if (!confirm('למחוק את הרשומה הזו מהיומן? אי אפשר לשחזר.')) return;
        entries = entries.filter(function (e) { return e.id !== id; });
        if (editingId === id) resetComposer();
        persist();
        renderEntries();
    }

    function sortedEntries() {
        return entries.slice().sort(function (a, b) {
            var d = String(b.date || '').localeCompare(String(a.date || ''));
            if (d !== 0) return d;
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
    }

    function renderEntries() {
        var mount = document.getElementById('diaryEntries');
        var countEl = document.getElementById('diaryCount');
        if (!mount) return;

        if (countEl) {
            var n = entries.length;
            countEl.textContent = n === 0 ? '' : (n === 1 ? 'רשומה אחת' : n + ' רשומות');
        }

        if (!entries.length) {
            mount.innerHTML =
                '<div class="diary-empty">' +
                '<div class="diary-empty__icon" aria-hidden="true">📖</div>' +
                '<p class="diary-empty__title">היומן של ' + esc(countryName || 'היעד') + ' עוד ריק</p>' +
                '<p class="diary-empty__text">שורה אחת ביום מספיקה. בעוד כמה שנים זה יהיה הדבר הכי שווה באתר הזה.</p>' +
                '</div>';
            return;
        }

        mount.innerHTML = sortedEntries().map(function (e) {
            var a = authorMeta(e.author);
            return (
                '<article class="diary-entry diary-entry--' + a.key + '" data-id="' + esc(e.id) + '">' +
                '<header class="diary-entry__head">' +
                '<span class="diary-entry__author"><span aria-hidden="true">' + a.emoji + '</span> ' + esc(a.label) + '</span>' +
                '<span class="diary-entry__date">' + esc(prettyDate(e.date)) + '</span>' +
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

    /* ---------- init ---------- */

    function resolveName(id, fallback) {
        if (fallback) return fallback;
        try {
            var c = (tripData.countries || []).find(function (x) { return x.id === id; });
            return c ? c.name : '';
        } catch (e) { return ''; }
    }

    function initDiary(id, name) {
        countryId = id;
        /* Read the name off tripData rather than hardcoding it per page, so a
           destination renamed in the itinerary editor renames its diary too. */
        countryName = resolveName(id, name);
        var mount = document.getElementById('diarySection');
        if (!mount) return;

        mount.innerHTML =
            '<div class="diary-header">' +
            '<h2>📖 יומן המסע — ' + esc(countryName || '') + '</h2>' +
            '<span class="diary-count" id="diaryCount"></span>' +
            '</div>' +
            '<p class="diary-intro">לא לו״ז ולא תכנון — פשוט איך היה. כתבו בכיף, תודו לעצמכם בעוד עשור.</p>' +
            '<div id="diaryComposer"></div>' +
            '<div id="diaryEntries" class="diary-entries"></div>';

        renderComposer();
        entries = loadLocal();
        renderEntries();

        var list = document.getElementById('diaryEntries');
        if (list) {
            list.addEventListener('click', function (ev) {
                var btn = ev.target.closest('.diary-entry__btn');
                if (!btn) return;
                var entry = btn.closest('.diary-entry');
                if (!entry) return;
                var id = entry.getAttribute('data-id');
                if (btn.dataset.act === 'edit') startEdit(id);
                else deleteEntry(id);
            });
        }

        subscribe();
    }

    window.initDiary = initDiary;
})();
