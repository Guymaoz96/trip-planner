(function() {
    'use strict';
    var TODO_DOC_ID = 'main';

    function id() { return 'id' + Date.now() + '_' + Math.random().toString(36).slice(2, 9); }

    function getListEl() { return document.getElementById('todoList'); }
    function getInputEl() { return document.getElementById('todoInput'); }

    function render(items) {
        var list = getListEl();
        if (!list) return;
        list.innerHTML = (items || []).map(function(t) {
            var done = t.done ? ' done' : '';
            var pressed = t.done ? 'true' : 'false';
            return (
                '<li class="todo-item' + done + '" data-id="' + t.id + '">' +
                '<input type="checkbox" ' + (t.done ? 'checked' : '') + ' aria-label="סימון בוצע">' +
                '<span class="todo-main" role="button" tabindex="0" aria-pressed="' + pressed + '" aria-label="לחיצה לסימון / ביטול סימון המשימה">' +
                '<span class="todo-check" aria-hidden="true">' + (t.done ? '✓' : '') + '</span>' +
                '<span class="todo-text">' + escapeHtml(t.text) + '</span>' +
                '</span>' +
                '<button type="button" class="todo-delete" aria-label="מחיקה">×</button>' +
                '</li>'
            );
        }).join('');

        list.querySelectorAll('.todo-item').forEach(function(li) {
            var tid = li.getAttribute('data-id');
            li.querySelector('input[type="checkbox"]').addEventListener('change', function() {
                /* מצב ה-checkbox כבר עודכן ב-DOM — שומרים כמו שהוא, בלי toggle */
                setItems(getItems());
            });
            li.querySelector('.todo-delete').addEventListener('click', function(e) {
                e.stopPropagation();
                deleteTodo(tid);
            });
        });
    }

    function bindTodoListClickToggle() {
        var list = getListEl();
        if (!list || list.__todoClickToggleBound) return;
        list.__todoClickToggleBound = true;
        list.addEventListener('click', function(e) {
            if (e.target.closest('.todo-delete')) return;
            if (e.target.closest('input[type="checkbox"]')) return;
            var main = e.target.closest('.todo-main');
            if (!main) return;
            var li = main.closest('.todo-item');
            if (!li) return;
            toggleTodo(li.getAttribute('data-id'));
        });
        list.addEventListener('keydown', function(e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            var main = e.target.closest('.todo-main');
            if (!main || !list.contains(main)) return;
            e.preventDefault();
            var li = main.closest('.todo-item');
            if (li) toggleTodo(li.getAttribute('data-id'));
        });
    }

    function escapeHtml(s) {
        if (!s) return '';
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    function saveToFirestore(items) {
        if (typeof db === 'undefined' || !db) return;
        try {
            db.collection('todos').doc(TODO_DOC_ID).set({
                items: items,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(function(err) { console.error('Todo save error', err); });
        } catch (e) {}
    }

    function loadFromFirestore(cb) {
        if (typeof db === 'undefined' || !db) {
            if (cb) cb(loadFromLocalStorage());
            return;
        }
        try {
            db.collection('todos').doc(TODO_DOC_ID).onSnapshot(function(doc) {
                /* Firestore snapshot: exists is a boolean property, not exists() */
                var serverItems = [];
                if (doc.exists) {
                    var d = doc.data();
                    if (d && d.items && Array.isArray(d.items)) serverItems = d.items;
                }
                var items;
                if (serverItems.length > 0) {
                    items = serverItems;
                } else {
                    var local = loadFromLocalStorage();
                    if (local.length > 0) {
                        items = local;
                        saveToLocalStorage(items);
                        saveToFirestore(items);
                    } else {
                        items = [];
                    }
                }
                if (cb) cb(items); else render(items);
            }, function(err) {
                console.warn('Firestore todo error', err);
                if (cb) cb(loadFromLocalStorage()); else render(loadFromLocalStorage());
            });
        } catch (e) {
            if (cb) cb(loadFromLocalStorage()); else render(loadFromLocalStorage());
        }
    }

    function loadFromLocalStorage() {
        try {
            var raw = localStorage.getItem('todos_' + TODO_DOC_ID);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function saveToLocalStorage(items) {
        try {
            localStorage.setItem('todos_' + TODO_DOC_ID, JSON.stringify(items || []));
        } catch (e) {}
    }

    function getItems() {
        var list = getListEl();
        if (!list) return [];
        return [].slice.call(list.querySelectorAll('.todo-item')).map(function(li) {
            var id = li.getAttribute('data-id');
            var text = li.querySelector('.todo-text') ? li.querySelector('.todo-text').textContent : '';
            var done = li.querySelector('input[type="checkbox"]') ? li.querySelector('input[type="checkbox"]').checked : false;
            return { id: id, text: text, done: done };
        });
    }

    function setItems(items) {
        saveToLocalStorage(items);
        saveToFirestore(items);
        render(items);
    }

    function addTodo() {
        var input = getInputEl();
        if (!input) return;
        var text = (input.value || '').trim();
        if (!text) return;
        input.value = '';
        var items = getItems();
        items.push({ id: id(), text: text, done: false });
        setItems(items);
    }

    function toggleTodo(tid) {
        var items = getItems().map(function(t) {
            if (t.id === tid) t.done = !t.done;
            return t;
        });
        setItems(items);
    }

    function deleteTodo(tid) {
        var items = getItems().filter(function(t) { return t.id !== tid; });
        setItems(items);
    }

    function persistTodosNow() {
        var list = getListEl();
        if (!list) return;
        var items = getItems();
        saveToLocalStorage(items);
        saveToFirestore(items);
    }

    document.addEventListener('DOMContentLoaded', function() {
        if (typeof initMobileMenu === 'function') initMobileMenu();
        bindTodoListClickToggle();
        loadFromFirestore(function(items) {
            render(Array.isArray(items) ? items : []);
        });

        var addBtn = document.getElementById('todoAddBtn');
        var input = getInputEl();
        if (addBtn) addBtn.addEventListener('click', addTodo);
        if (input) input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') addTodo();
        });

        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden') persistTodosNow();
        });
        window.addEventListener('pagehide', persistTodosNow);
        window.addEventListener('beforeunload', persistTodosNow);
    });
})();
