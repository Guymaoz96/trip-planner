(function() {
    'use strict';
    var editModeEnabled = false;
    var STORAGE_KEY = 'summer_trip_26_timelines';
    var timelineUnsub = null;

    function getScope() {
        return window.__timelineScopeRoot || document;
    }

    function getTimelineDocId() {
        if (typeof window !== 'undefined' && window.TIMELINE_DOC_ID) {
            return window.TIMELINE_DOC_ID;
        }
        var params = new URLSearchParams(window.location.search || '');
        var c = (params.get('country') || '').trim();
        var w = (params.get('week') || '1').trim();
        var d = (params.get('day') || '1').trim();
        if (c) return c + '_w' + w + '_d' + d;
        /* Never use pathname fallback — it caused empty saves under keys like "day_<country>.html" and wiped real data. */
        return null;
    }

    function addEditModeToggle() {
        var root = getScope();
        var section = root.querySelector('.activities-section');
        if (!section) return;
        var h2 = section.querySelector('h2');
        var old = root.querySelector('#editModeToggle');
        if (old) old.remove();
        if (!h2) return;
        var btn = document.createElement('button');
        btn.id = 'editModeToggle';
        btn.className = 'edit-mode-toggle';
        btn.textContent = 'מצב עריכה ✏️';
        btn.onclick = toggleEditMode;
        h2.parentNode.insertBefore(btn, h2.nextSibling);
    }

    function toggleEditMode() {
        editModeEnabled = !editModeEnabled;
        var root = getScope();
        var btn = root.querySelector('#editModeToggle');
        if (!btn) return;
        if (editModeEnabled) {
            btn.textContent = 'סיום עריכה ✏️';
            btn.classList.add('active');
            enableEditMode();
        } else {
            btn.textContent = 'מצב עריכה ✏️';
            btn.classList.remove('active');
            disableEditMode();
            saveTimeline();
        }
        hidePlaceholder();
    }

    function hidePlaceholder() {
        var root = getScope();
        var ph = root.querySelector('#timelinePlaceholder');
        if (!ph) return;
        var hasItems = root.querySelectorAll('.timeline-item').length > 0;
        ph.style.display = (editModeEnabled || hasItems) ? 'none' : 'block';
    }

    function enableEditMode() {
        var root = getScope();
        root.querySelectorAll('.timeline-item').forEach(function(item) { addEditControls(item); });
        addNewItemButton();
        updateTimeline();
    }

    function disableEditMode() {
        var root = getScope();
        root.querySelectorAll('.edit-controls').forEach(function(el) { el.remove(); });
        var addBtn = root.querySelector('#addNewItemBtn');
        if (addBtn) addBtn.remove();
    }

    function addEditControls(item) {
        if (item.querySelector('.edit-controls')) return;
        var controls = document.createElement('div');
        controls.className = 'edit-controls';
        controls.innerHTML =
            '<button class="edit-btn" type="button" title="עריכה" aria-label="עריכה">✏️</button>' +
            '<button class="delete-btn" type="button" title="מחיקה" aria-label="מחיקה">🗑️</button>';
        var content = item.querySelector('.timeline-content');
        if (content) content.appendChild(controls);
        controls.querySelector('.edit-btn').onclick = function() { editTimelineItem(this); };
        controls.querySelector('.delete-btn').onclick = function() { deleteTimelineItem(this); };
    }

    function editTimelineItem(btn) {
        var item = btn.closest('.timeline-item');
        var content = item.querySelector('.timeline-content p');
        var link = item.querySelector('.timeline-link');
        var timeEl = item.querySelector('.timeline-time');
        var currentText = content ? content.textContent : '';
        var currentTime = timeEl ? timeEl.textContent : '08:00';
        var currentLink = link ? link.href : '';

        var form = document.createElement('div');
        form.className = 'edit-form';
        form.innerHTML =
            '<div class="edit-form-group"><label>שעה</label><input type="text" class="edit-time" value="' + escapeHtml(currentTime) + '" placeholder="08:00"></div>' +
            '<div class="edit-form-group"><label>תיאור</label><textarea class="edit-description" rows="3">' + escapeHtml(currentText) + '</textarea></div>' +
            '<div class="edit-form-group"><label>קישור (אופציונלי)</label><input type="text" class="edit-link" value="' + escapeHtml(currentLink) + '" placeholder="https://..."></div>' +
            '<div class="edit-form-actions"><button type="button" class="save-btn">שמירה</button> <button type="button" class="cancel-btn">ביטול</button></div>';
        var oldContent = content ? content.parentElement : item.querySelector('.timeline-content');
        if (oldContent) oldContent.style.display = 'none';
        oldContent.parentNode.insertBefore(form, oldContent.nextSibling);

        form.querySelector('.save-btn').onclick = function() { saveEdit(form, item, oldContent); };
        form.querySelector('.cancel-btn').onclick = function() { cancelEdit(form, oldContent); };
    }

    function escapeHtml(s) {
        if (!s) return '';
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    /* Label a timeline link by its target, instead of always saying "Google Maps". */
    function linkLabel(url) {
        var u = (url || '').trim();
        if (!u) return '';
        var lower = u.toLowerCase();
        if (/google\.[^/]*\/maps|maps\.google|maps\.app\.goo\.gl|goo\.gl\/maps/.test(lower)) return '📍 פתח במפות';
        if (/waze\.com|waze\.to/.test(lower)) return '🚗 פתח ב-Waze';
        var host = '';
        try {
            host = new URL(u.indexOf('//') === -1 ? 'https://' + u : u).hostname.replace(/^www\./, '');
        } catch (e) {}
        return host ? '🔗 ' + host : '🔗 פתח קישור';
    }

    function saveEdit(form, item, oldContent) {
        var newTime = (form.querySelector('.edit-time').value || '').trim();
        var newDescription = (form.querySelector('.edit-description').value || '').trim();
        var newLink = (form.querySelector('.edit-link').value || '').trim();
        if (!newTime || !newDescription) {
            alert('נא למלא שעה ותיאור.');
            return;
        }
        var timeEl = item.querySelector('.timeline-time');
        if (timeEl) timeEl.textContent = newTime;
        var p = oldContent ? oldContent.querySelector('p') : null;
        if (p) p.textContent = newDescription;
        var linkEl = oldContent ? oldContent.querySelector('.timeline-link') : null;
        if (newLink) {
            if (!linkEl) {
                linkEl = document.createElement('a');
                linkEl.className = 'timeline-link';
                linkEl.target = '_blank';
                if (oldContent) oldContent.appendChild(linkEl);
            }
            linkEl.href = newLink;
            linkEl.textContent = linkLabel(newLink);
        } else if (linkEl) linkEl.remove();
        if (oldContent) oldContent.style.display = 'block';
        form.remove();
        updateTimeline();
        saveTimeline();
    }

    function cancelEdit(form, oldContent) {
        if (oldContent) oldContent.style.display = 'block';
        form.remove();
    }

    function deleteTimelineItem(btn) {
        if (!confirm('למחוק את הפעילות?')) return;
        var item = btn.closest('.timeline-item');
        if (item) {
            item.style.opacity = '0';
            setTimeout(function() {
                item.remove();
                updateTimeline();
                saveTimeline();
                hidePlaceholder();
            }, 200);
        }
    }

    function addNewItemButton() {
        var root = getScope();
        var container = root.querySelector('.timeline-container');
        if (!container || root.querySelector('#addNewItemBtn')) return;
        var btn = document.createElement('button');
        btn.id = 'addNewItemBtn';
        btn.className = 'add-new-item-btn';
        btn.type = 'button';
        btn.textContent = '+ הוסף פעילות';
        btn.onclick = addNewTimelineItem;
        container.appendChild(btn);
    }

    function addNewTimelineItem() {
        var root = getScope();
        var container = root.querySelector('.timeline-container');
        if (!container) return;
        var times = root.querySelectorAll('.timeline-time');
        var lastTime = times.length ? times[times.length - 1].textContent : '08:00';
        var item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML =
            '<div class="timeline-dot"></div><div class="timeline-time">' + escapeHtml(lastTime) + '</div>' +
            '<div class="timeline-content"><p>פעילות חדשה</p></div>';
        var line = container.querySelector('.timeline-line');
        if (line) line.parentNode.insertBefore(item, line.nextSibling);
        addEditControls(item);
        updateTimeline();
        saveTimeline();
        hidePlaceholder();
        var editBtn = item.querySelector('.edit-btn');
        if (editBtn) editTimelineItem(editBtn);
    }

    function updateTimeline() {
        var root = getScope();
        var container = root.querySelector('.timeline-container');
        if (!container) return;
        var items = [].slice.call(container.querySelectorAll('.timeline-item'));
        var line = container.querySelector('.timeline-line');
        if (items.length === 0) {
            if (line) line.style.display = 'none';
            return;
        }
        if (line) line.style.display = 'block';
        function parseTime(s) {
            var parts = (s || '').split(':');
            if (parts.length !== 2) return 0;
            return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
        }
        items.sort(function(a, b) {
            return parseTime(a.querySelector('.timeline-time').textContent) - parseTime(b.querySelector('.timeline-time').textContent);
        });
        var parent = line.parentNode;
        items.forEach(function(it) { parent.appendChild(it); });
        parent.insertBefore(line, parent.firstChild);
    }

    function saveTimeline() {
        var docId = getTimelineDocId();
        if (!docId) return;
        /* Country pages: always read from the open detail panel if visible — __timelineScopeRoot can desync and would save [] and wipe storage. */
        var panel = typeof document !== 'undefined' ? document.getElementById('countryDetailContent') : null;
        var root;
        if (panel && !panel.hidden && panel.querySelector('.timeline-container')) {
            root = panel;
        } else {
            root = getScope();
        }
        if (!root || typeof root.querySelectorAll !== 'function') return;
        var items = [].slice.call(root.querySelectorAll('.timeline-item')).map(function(item) {
            var time = (item.querySelector('.timeline-time') || {}).textContent || '';
            var p = item.querySelector('.timeline-content p');
            var description = p ? p.textContent : '';
            var linkEl = item.querySelector('.timeline-link');
            var link = linkEl ? linkEl.href : '';
            return { time: time, description: description, link: link };
        });
        var payload = JSON.stringify(items);
        var allPayload = null;
        try {
            var all = {};
            try {
                var raw = localStorage.getItem(STORAGE_KEY);
                if (raw) all = JSON.parse(raw);
            } catch (e2) {}
            all[docId] = items;
            allPayload = JSON.stringify(all);
            localStorage.setItem(STORAGE_KEY, allPayload);
            localStorage.setItem('timeline_' + docId, payload);
        } catch (e) {
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('לא ניתן לשמור ציר זמן ב-localStorage (אולי דפדפן פרטי או file://).', e);
            }
        }
        try {
            sessionStorage.setItem('timeline_' + docId, payload);
            if (allPayload) sessionStorage.setItem(STORAGE_KEY, allPayload);
        } catch (e2) {}
        if (typeof db !== 'undefined' && db) {
            try {
                db.collection('timeline').doc(docId).set({
                    items: items,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(function(err) { console.error('Firebase save error', err); });
            } catch (e) {}
        }
    }

    function readTimelineItemsFromStorage(docId) {
        if (!docId) return null;
        var items = null;
        var raw;
        try {
            /* Prefer localStorage first: sessionStorage can hold a stale "[]" that hid a good local copy. */
            raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var allLocal = JSON.parse(raw);
                if (allLocal[docId] && allLocal[docId].length > 0) items = allLocal[docId];
            }
            if (!items || items.length === 0) {
                raw = localStorage.getItem('timeline_' + docId);
                if (raw) items = JSON.parse(raw);
            }
            if (!items || items.length === 0) {
                raw = sessionStorage.getItem(STORAGE_KEY);
                if (raw) {
                    var allSess = JSON.parse(raw);
                    if (allSess[docId] && allSess[docId].length > 0) items = allSess[docId];
                }
            }
            if (!items || items.length === 0) {
                raw = sessionStorage.getItem('timeline_' + docId);
                if (raw) items = JSON.parse(raw);
            }
        } catch (e) {}
        return items && items.length ? items : null;
    }

    function pushTimelineToFirestore(docId, items) {
        if (!docId || !items || !items.length) return;
        if (typeof db === 'undefined' || !db) return;
        try {
            db.collection('timeline').doc(docId).set({
                items: items,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(function(err) { console.error('Firebase sync timeline', err); });
        } catch (e) {}
    }

    function loadSavedChanges() {
        var docId = getTimelineDocId();
        if (!docId) return;
        if (timelineUnsub) {
            try { timelineUnsub(); } catch (e) {}
            timelineUnsub = null;
        }
        if (typeof db !== 'undefined' && db) {
            try {
                timelineUnsub = db.collection('timeline').doc(docId).onSnapshot(function(doc) {
                    /* Firestore snapshot: exists is a boolean property, not exists() */
                    var serverItems = [];
                    if (doc.exists) {
                        var d = doc.data();
                        if (d && d.items && Array.isArray(d.items)) serverItems = d.items;
                    }
                    if (serverItems.length > 0) {
                        renderTimelineItems(serverItems);
                        hidePlaceholder();
                        return;
                    }
                    var localItems = readTimelineItemsFromStorage(docId);
                    if (localItems && localItems.length > 0) {
                        renderTimelineItems(localItems);
                        hidePlaceholder();
                        pushTimelineToFirestore(docId, localItems);
                        return;
                    }
                    loadFromLocalStorage(docId);
                }, function(err) {
                    console.warn('Firestore error', err);
                    loadFromLocalStorage(docId);
                });
            } catch (e) {
                loadFromLocalStorage(docId);
            }
        } else {
            loadFromLocalStorage(docId);
        }
    }

    function loadFromLocalStorage(docId) {
        if (!docId) return;
        try {
            var items = readTimelineItemsFromStorage(docId);
            if (items && items.length > 0) {
                renderTimelineItems(items);
                hidePlaceholder();
            }
        } catch (e) {}
    }

    /* Rebuilds the whole timeline from saved data — every .timeline-item is
       thrown away and recreated, so anything the user was in the middle of
       goes with it. That matters because a save echoes straight back through
       the Firestore listener: adding an activity saved immediately, and ~150ms
       later its own snapshot wiped both the open edit form and every ✏️/🗑️
       button, leaving a "פעילות חדשה" that could not be edited until edit mode
       was toggled off and on. So: never re-render over an open form, and
       re-apply the edit controls to the fresh markup when edit mode is on. */
    function renderTimelineItems(items) {
        var root = getScope();
        var container = root.querySelector('.timeline-container');
        if (!container) return;
        if (container.querySelector('.edit-form')) return;
        container.querySelectorAll('.timeline-item').forEach(function(el) { el.remove(); });
        var line = container.querySelector('.timeline-line');
        (items || []).forEach(function(data) {
            var item = document.createElement('div');
            item.className = 'timeline-item';
            var linkHtml = data.link ? '<a href="' + escapeHtml(data.link) + '" target="_blank" rel="noopener" class="timeline-link">' + escapeHtml(linkLabel(data.link)) + '</a>' : '';
            item.innerHTML =
                '<div class="timeline-dot"></div><div class="timeline-time">' + escapeHtml(data.time) + '</div>' +
                '<div class="timeline-content"><p>' + escapeHtml(data.description) + '</p>' + linkHtml + '</div>';
            if (line) line.parentNode.insertBefore(item, line.nextSibling);
        });
        updateTimeline();
        if (editModeEnabled) {
            container.querySelectorAll('.timeline-item').forEach(function(item) { addEditControls(item); });
        }
        hidePlaceholder();
    }

    function bindUnloadOnce() {
        if (window.__timelineUnloadBound) return;
        window.__timelineUnloadBound = true;
        window.addEventListener('beforeunload', function() { saveTimeline(); });
        window.addEventListener('pagehide', function() { saveTimeline(); });
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden') saveTimeline();
        });
        document.addEventListener('click', function(ev) {
            var a = ev.target && (ev.target.closest ? ev.target.closest('a') : ev.target);
            if (a && a.href && a.target !== '_blank' && !a.hash) {
                var href = a.getAttribute('href') || '';
                if (href.indexOf('javascript:') !== 0 && href !== '#') saveTimeline();
            }
        }, true);
    }

    function initEditMode() {
        window.__timelineScopeRoot = null;
        editModeEnabled = false;
        if (!getScope().querySelector('.timeline-container')) return;
        bindUnloadOnce();
        addEditModeToggle();
        loadSavedChanges();
        setTimeout(function() {
            updateTimeline();
            hidePlaceholder();
        }, 300);
    }

    window.initTimelinePanel = function() {
        editModeEnabled = false;
        bindUnloadOnce();
        addEditModeToggle();
        loadSavedChanges();
        setTimeout(function() {
            updateTimeline();
            hidePlaceholder();
        }, 200);
    };

    window.saveTimelineNow = saveTimeline;

    document.addEventListener('DOMContentLoaded', function() {
        initEditMode();
    });
})();
