(function () {
    'use strict';

    function getCountry() {
        var el = document.getElementById('photoWall');
        return el ? el.getAttribute('data-country') : null;
    }

    function id() { return 'p' + Date.now() + '_' + Math.random().toString(36).slice(2, 6); }

    function normUrl(url) {
        url = url.trim();
        var drive = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
        if (drive) return 'https://lh3.googleusercontent.com/d/' + drive[1] + '=w800';
        return url;
    }

    var state = { items: [] };

    function lsKey(c) { return 'photos_' + c; }

    function saveLs(c, items) {
        try { localStorage.setItem(lsKey(c), JSON.stringify(items)); } catch (e) {}
    }

    function loadLs(c) {
        try { var r = localStorage.getItem(lsKey(c)); return r ? JSON.parse(r) : []; } catch (e) { return []; }
    }

    function saveFs(c, items) {
        if (typeof db === 'undefined' || !db) return;
        try {
            db.collection('photos').doc(c).set({
                items: items,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(function (e) { console.warn('photos save', e); });
        } catch (e) {}
    }

    function loadFs(c, cb) {
        if (typeof db === 'undefined' || !db) { cb(loadLs(c)); return; }
        try {
            db.collection('photos').doc(c).onSnapshot(function (doc) {
                if (doc.exists && doc.data() && doc.data().items) {
                    cb(doc.data().items);
                } else {
                    cb(loadLs(c));
                }
            }, function () { cb(loadLs(c)); });
        } catch (e) { cb(loadLs(c)); }
    }

    function setItems(c, items) {
        state.items = items;
        saveLs(c, items);
        saveFs(c, items);
        render(c, items);
    }

    function render(c, items) {
        var wall = document.getElementById('photoWall');
        if (!wall) return;

        if (!items.length) {
            wall.innerHTML = '<div class="photo-empty">📷 אין עדיין תמונות — לחץ + כדי להוסיף</div>';
            return;
        }
        wall.innerHTML = items.map(function (item) {
            var src = normUrl(item.url);
            return '<div class="photo-card" data-id="' + item.id + '">' +
                '<img src="' + src + '" alt="' + (item.caption || '') + '" loading="lazy" onerror="this.src=\'data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;200&quot; height=&quot;150&quot;><rect width=&quot;200&quot; height=&quot;150&quot; fill=&quot;%23e2e8f0&quot;/><text x=&quot;50%&quot; y=&quot;50%&quot; dominant-baseline=&quot;middle&quot; text-anchor=&quot;middle&quot; font-size=&quot;30&quot;>🖼️</text></svg>\'">' +
                '<button class="photo-del" aria-label="מחק">×</button>' +
                (item.caption ? '<div class="photo-caption">' + item.caption + '</div>' : '') +
                '</div>';
        }).join('');

        wall.querySelectorAll('.photo-card').forEach(function (card) {
            var pid = card.getAttribute('data-id');
            card.querySelector('img').addEventListener('click', function () {
                var item = state.items.find(function (i) { return i.id === pid; });
                if (item) window.open(normUrl(item.url), '_blank');
            });
            card.querySelector('.photo-del').addEventListener('click', function (e) {
                e.stopPropagation();
                setItems(c, state.items.filter(function (i) { return i.id !== pid; }));
            });
        });
    }

    function showAddModal(c) {
        var existing = document.getElementById('photoModal');
        if (existing) existing.remove();

        var modal = document.createElement('div');
        modal.id = 'photoModal';
        modal.className = 'photo-modal-backdrop';
        modal.innerHTML =
            '<div class="photo-modal">' +
            '<h3>הוסף תמונה</h3>' +
            '<input type="url" id="photoUrl" placeholder="URL של תמונה (גם Google Drive)" dir="ltr">' +
            '<input type="text" id="photoCaption" placeholder="כיתוב אופציונלי" style="margin-top:0.5rem">' +
            '<div class="photo-modal-btns">' +
            '<button id="photoSave">הוסף</button>' +
            '<button id="photoCancel" class="secondary">ביטול</button>' +
            '</div>' +
            '</div>';
        document.body.appendChild(modal);

        modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
        document.getElementById('photoCancel').addEventListener('click', function () { modal.remove(); });
        document.getElementById('photoSave').addEventListener('click', function () {
            var url = (document.getElementById('photoUrl').value || '').trim();
            if (!url) return;
            var caption = (document.getElementById('photoCaption').value || '').trim();
            setItems(c, state.items.concat([{ id: id(), url: url, caption: caption }]));
            modal.remove();
        });
        document.getElementById('photoUrl').focus();
    }

    document.addEventListener('DOMContentLoaded', function () {
        var c = getCountry();
        if (!c) return;

        loadFs(c, function (items) {
            state.items = items;
            render(c, items);
        });

        var addBtn = document.getElementById('photoAddBtn');
        if (addBtn) addBtn.addEventListener('click', function () { showAddModal(c); });
    });
})();
