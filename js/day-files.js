(function () {
    'use strict';

    /* Important files/documents attached to a single day, keyed by the same
       docId as the timeline (country_wW_dD / merged id). Stored in Firestore
       collection "dayFiles" + localStorage, mirroring the photo-wall pattern.
       Files are referenced by link (Drive/Dropbox/URL) — no binary upload. */

    var currentDocId = null;
    var unsub = null;
    var state = { items: [] };

    function id() { return 'f' + Date.now() + '_' + Math.random().toString(36).slice(2, 6); }

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = String(s == null ? '' : s);
        return d.innerHTML;
    }

    function lsKey(docId) { return 'dayfiles_' + docId; }

    function normUrl(url) {
        url = (url || '').trim();
        if (!url) return '';
        if (url.indexOf('//') === -1 && !/^[a-z]+:/i.test(url)) return 'https://' + url;
        return url;
    }

    function fileHost(url) {
        try { return new URL(normUrl(url)).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
    }

    function fileIcon(url) {
        var u = (url || '').toLowerCase();
        if (/\.pdf(\?|$)/.test(u)) return '📄';
        if (/drive\.google|docs\.google/.test(u)) return '📁';
        if (/dropbox/.test(u)) return '📦';
        if (/\.(png|jpe?g|gif|webp|heic)(\?|$)/.test(u)) return '🖼️';
        if (/\.(xlsx?|csv|numbers)(\?|$)/.test(u)) return '📊';
        return '📎';
    }

    function saveLs(items) {
        try { localStorage.setItem(lsKey(currentDocId), JSON.stringify(items)); } catch (e) {}
    }

    function loadLs(docId) {
        try { var r = localStorage.getItem(lsKey(docId)); return r ? JSON.parse(r) : []; } catch (e) { return []; }
    }

    function saveFs(items) {
        if (typeof db === 'undefined' || !db || !currentDocId) return;
        try {
            db.collection('dayFiles').doc(currentDocId).set({
                items: items,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(function (e) { console.warn('dayFiles save', e); });
        } catch (e) {}
    }

    function setItems(items) {
        state.items = items;
        saveLs(items);
        saveFs(items);
        render();
    }

    function render() {
        var mount = document.getElementById('dayFilesMount');
        if (!mount) return;
        var list = state.items.length
            ? '<ul class="day-files-list">' + state.items.map(function (it) {
                var url = esc(normUrl(it.url));
                var label = esc(it.name || fileHost(it.url) || 'קובץ');
                return '<li class="day-file" data-id="' + esc(it.id) + '">' +
                    '<a href="' + url + '" target="_blank" rel="noopener" class="day-file-link">' +
                    '<span class="day-file-icon" aria-hidden="true">' + fileIcon(it.url) + '</span>' +
                    '<span class="day-file-name">' + label + '</span>' +
                    '</a>' +
                    '<button type="button" class="day-file-del" aria-label="מחק">×</button>' +
                    '</li>';
            }).join('') + '</ul>'
            : '<p class="day-files-empty">אין עדיין קבצים — הוסיפו הזמנות, כרטיסים ומסמכים חשובים ליום זה.</p>';

        mount.innerHTML =
            '<div class="day-files-header">' +
            '<h3>📎 קבצים חשובים</h3>' +
            '<button type="button" class="day-files-add" id="dayFileAddBtn">+ הוסף קובץ</button>' +
            '</div>' + list;

        var addBtn = document.getElementById('dayFileAddBtn');
        if (addBtn) addBtn.onclick = showAddModal;
        mount.querySelectorAll('.day-file-del').forEach(function (b) {
            b.onclick = function () {
                var li = b.closest('.day-file');
                var fid = li && li.getAttribute('data-id');
                if (!confirm('להסיר את הקובץ?')) return;
                setItems(state.items.filter(function (i) { return i.id !== fid; }));
            };
        });
    }

    function showAddModal() {
        var existing = document.getElementById('dayFileModal');
        if (existing) existing.remove();
        var modal = document.createElement('div');
        modal.id = 'dayFileModal';
        modal.className = 'photo-modal-backdrop';
        modal.innerHTML =
            '<div class="photo-modal">' +
            '<h3>הוסף קובץ חשוב</h3>' +
            '<input type="text" id="dayFileName" placeholder="שם הקובץ (למשל: הזמנת מלון, כרטיס טיסה)">' +
            '<input type="url" id="dayFileUrl" placeholder="קישור לקובץ (Google Drive / Dropbox / URL)" dir="ltr" style="margin-top:0.5rem">' +
            '<p class="day-files-hint">העלו את הקובץ ל-Google Drive / Dropbox והדביקו כאן את הקישור לשיתוף.</p>' +
            '<div class="photo-modal-btns">' +
            '<button id="dayFileSave">הוסף</button>' +
            '<button id="dayFileCancel" class="secondary">ביטול</button>' +
            '</div></div>';
        document.body.appendChild(modal);
        modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
        document.getElementById('dayFileCancel').onclick = function () { modal.remove(); };
        document.getElementById('dayFileSave').onclick = function () {
            var url = (document.getElementById('dayFileUrl').value || '').trim();
            if (!url) { alert('נא להדביק קישור לקובץ.'); return; }
            var name = (document.getElementById('dayFileName').value || '').trim();
            setItems(state.items.concat([{ id: id(), name: name, url: url }]));
            modal.remove();
        };
        document.getElementById('dayFileName').focus();
    }

    function load() {
        if (unsub) { try { unsub(); } catch (e) {} unsub = null; }
        state.items = loadLs(currentDocId);
        render();
        if (typeof db !== 'undefined' && db && currentDocId) {
            try {
                unsub = db.collection('dayFiles').doc(currentDocId).onSnapshot(function (doc) {
                    if (doc.exists && doc.data() && Array.isArray(doc.data().items)) {
                        state.items = doc.data().items;
                        saveLs(state.items);
                        render();
                    }
                }, function () {});
            } catch (e) {}
        }
    }

    /* Called by the day detail panel (country pages) and by pages/day.html. */
    window.initDayFilesPanel = function (docId) {
        var mount = document.getElementById('dayFilesMount');
        if (!mount || !docId) return;
        currentDocId = docId;
        load();
    };
})();
