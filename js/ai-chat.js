(function () {
    'use strict';

    var STORAGE_KEY = 'gemini_api_key';
    var HISTORY_KEY = 'gemini_history';
    var chatHistory = [];
    var isOpen = false;

    /* EXAMPLE trip context. Replace the trip details below with the real trip so
       the assistant gives relevant answers. Keep it short — a few bullet lines. */
    var SYSTEM_PROMPT =
        'אתה עוזר נסיעות אישי לירח דבש של גיא ועדי באינדונזיה.\n' +
        'פרטי הטיול (19 ביולי – 14 באוגוסט 2026, נחיתה והמראה מבאלי):\n' +
        '- אולוואטו (19–23.7): עיירת גלישה, חופים (Dreamland, Balangan, Melasti), ביץ׳ קלאבים, מקדש אולוואטו לשקיעה.\n' +
        '- ראג׳ה אמפט (23–30.7): צלילה/שנורקל מרוחק, מיסול ומנסואר, home stays, מזומן בלבד.\n' +
        '- סידמן (30.7–2.8): כפר רגוע, טרסות אורז, מפל Gembleng, סדנת בישול.\n' +
        '- גילי אייר (2–4.8): אי קטן, שנורקל צבים, יוגה.\n' +
        '- נוסה (4–8.8): למבונגן/פנידה/צ׳נינגן, צלילת מנטות, חופים דרמטיים.\n' +
        '- מונדוק (8–10.8): הרים, אגם, מפלים, אוויר קריר.\n' +
        '- אובוד (10–14.8): תרבות, שווקים, ריזורט ג׳ונגל, זריחה בהר בטור.\n' +
        'הטיול מבוסס על סיפור דרך של חברים. מזומן חשוב מאוד (1–2 מיליון רופי), Grab/Gojek לתחבורה, אופנוע ביעדים רבים.\n' +
        'ענה תמיד בעברית. עזור לתכנן, המלץ על מסעדות/אתרים, ספק טיפים מעשיים, הצע פעילויות רומנטיות לירח דבש. היה קצר ומועיל.';

    function getKey() { return localStorage.getItem(STORAGE_KEY) || ''; }
    function saveKey(k) { localStorage.setItem(STORAGE_KEY, k.trim()); }

    function saveHistory() {
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(chatHistory.slice(-40))); } catch (e) {}
    }

    function loadHistory() {
        try { var r = localStorage.getItem(HISTORY_KEY); return r ? JSON.parse(r) : []; } catch (e) { return []; }
    }

    function clearHistory() {
        chatHistory = [];
        try { localStorage.removeItem(HISTORY_KEY); } catch (e) {}
        var msgs = document.getElementById('aiMessages');
        if (msgs) msgs.innerHTML = '';
        renderMsg('bot', 'שיחה חדשה! 🌍 במה אעזור?');
    }

    /* simple markdown → HTML for bot messages */
    function renderMd(text) {
        var s = text
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^#{1,3}\s+(.+)$/gm, '<strong>$1</strong>')
            .replace(/\n\n+/g, '<br><br>')
            .replace(/\n/g, '<br>');
        return s;
    }

    function buildPanelHTML() {
        return '<div class="ai-chat-header">' +
            '<span class="ai-chat-title">🤖 עוזר הטיול</span>' +
            '<div class="ai-chat-header-btns">' +
            '<button class="ai-icon-btn" id="aiClearBtn" title="נקה שיחה" aria-label="נקה שיחה">🗑️</button>' +
            '<button class="ai-icon-btn" id="aiKeyBtn" title="שנה מפתח API" aria-label="שנה מפתח API">🔑</button>' +
            '<button class="ai-icon-btn" id="aiCloseBtn" aria-label="סגור">✕</button>' +
            '</div></div>' +
            '<div class="ai-messages" id="aiMessages"></div>' +
            '<div class="ai-key-form" id="aiKeyForm">' +
            '<p>הדבק מפתח API של Gemini מ-<b>aistudio.google.com/apikey</b></p>' +
            '<input type="password" id="aiKeyInput" placeholder="AIzaSy..." autocomplete="off" dir="ltr">' +
            '<button type="button" id="aiKeySave">שמור והתחל</button>' +
            '</div>' +
            '<div class="ai-input-row" id="aiInputRow" hidden>' +
            '<input type="text" id="aiInput" placeholder="שאל על הטיול..." maxlength="1000" autocomplete="off">' +
            '<button type="button" id="aiSend">שלח</button>' +
            '</div>';
    }

    function inject() {
        if (document.getElementById('aiChatFab')) return;

        var fab = document.createElement('button');
        fab.id = 'aiChatFab';
        fab.className = 'ai-chat-fab';
        fab.setAttribute('aria-label', 'פתח עוזר טיול AI');
        fab.innerHTML = '<span>🤖</span>';
        fab.addEventListener('click', togglePanel);
        document.body.appendChild(fab);

        var panel = document.createElement('div');
        panel.id = 'aiChatPanel';
        panel.className = 'ai-chat-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'עוזר טיול AI');
        panel.innerHTML = buildPanelHTML();
        document.body.appendChild(panel);

        document.getElementById('aiCloseBtn').addEventListener('click', closePanel);
        document.getElementById('aiKeyBtn').addEventListener('click', showKeyForm);
        document.getElementById('aiClearBtn').addEventListener('click', clearHistory);
        document.getElementById('aiKeySave').addEventListener('click', onSaveKey);
        document.getElementById('aiSend').addEventListener('click', sendMessage);
        document.getElementById('aiInput').addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        });
        document.getElementById('aiKeyInput').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') onSaveKey();
        });

        /* restore saved history */
        var saved = loadHistory();
        if (saved.length) {
            chatHistory = saved;
            saved.forEach(function (m) { renderMsg(m.role, m.text); });
            var msgs = document.getElementById('aiMessages');
            if (msgs) msgs.scrollTop = msgs.scrollHeight;
        }
    }

    function togglePanel() { isOpen ? closePanel() : openPanel(); }

    function openPanel() {
        isOpen = true;
        document.getElementById('aiChatPanel').classList.add('is-open');
        document.getElementById('aiChatFab').classList.add('is-open');
        if (!getKey()) {
            showKeyForm();
        } else {
            showChatArea();
            if (chatHistory.length === 0) {
                renderMsg('bot', 'שלום! 🌍 אני עוזר הטיול שלך. במה אעזור?');
            }
            setTimeout(function () {
                var inp = document.getElementById('aiInput');
                if (inp) inp.focus();
            }, 350);
        }
    }

    function closePanel() {
        isOpen = false;
        document.getElementById('aiChatPanel').classList.remove('is-open');
        document.getElementById('aiChatFab').classList.remove('is-open');
    }

    function showKeyForm() {
        document.getElementById('aiKeyForm').hidden = false;
        document.getElementById('aiInputRow').hidden = true;
        var inp = document.getElementById('aiKeyInput');
        inp.value = getKey();
        inp.focus();
    }

    function showChatArea() {
        document.getElementById('aiKeyForm').hidden = true;
        document.getElementById('aiInputRow').hidden = false;
    }

    function onSaveKey() {
        var key = (document.getElementById('aiKeyInput').value || '').trim();
        if (!key) return;
        saveKey(key);
        showChatArea();
        if (chatHistory.length === 0) {
            renderMsg('bot', 'שלום! 🌍 אני עוזר הטיול שלך. במה אעזור?');
        }
        document.getElementById('aiInput').focus();
    }

    /* render message into DOM without pushing to chatHistory */
    function renderMsg(role, text) {
        var msgs = document.getElementById('aiMessages');
        if (!msgs) return;
        var div = document.createElement('div');
        div.className = 'ai-msg ai-msg--' + (role === 'user' ? 'user' : 'bot');
        if (role === 'user') {
            div.textContent = text;
        } else {
            div.innerHTML = renderMd(text);
        }
        msgs.appendChild(div);
    }

    /* render + push to history + save */
    function appendMsg(role, text) {
        renderMsg(role, text);
        chatHistory.push({ role: role, text: text });
        saveHistory();
        var msgs = document.getElementById('aiMessages');
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }

    function addTyping() {
        var msgs = document.getElementById('aiMessages');
        var div = document.createElement('div');
        div.id = 'aiTyping';
        div.className = 'ai-msg ai-msg--bot ai-typing';
        div.innerHTML = '<span></span><span></span><span></span>';
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
    }

    function removeTyping() {
        var el = document.getElementById('aiTyping');
        if (el) el.remove();
    }

    function geminiRequest(model, key, contents) {
        return fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-goog-api-key': key },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                    contents: contents
                })
            }
        ).then(function (resp) {
            if (!resp.ok) {
                return resp.json().catch(function () { return {}; }).then(function (err) {
                    var msg = (err.error && err.error.message) ? err.error.message : 'HTTP ' + resp.status;
                    var e = new Error(msg);
                    e.status = resp.status;
                    throw e;
                });
            }
            return resp.json();
        });
    }

    function callGemini(key, contents) {
        return geminiRequest('gemini-flash-latest', key, contents).catch(function (e) {
            if (e.status === 429 || (e.message && (e.message.indexOf('free_tier') !== -1 || e.message.indexOf('quota') !== -1))) {
                return geminiRequest('gemini-1.5-flash', key, contents);
            }
            throw e;
        });
    }

    function sendMessage() {
        var input = document.getElementById('aiInput');
        var text = (input.value || '').trim();
        if (!text) return;
        var key = getKey();
        if (!key) { showKeyForm(); return; }

        input.value = '';
        chatHistory.push({ role: 'user', text: text });
        renderMsg('user', text);
        saveHistory();
        var msgs = document.getElementById('aiMessages');
        if (msgs) msgs.scrollTop = msgs.scrollHeight;

        var sendBtn = document.getElementById('aiSend');
        sendBtn.disabled = true;
        input.disabled = true;
        addTyping();

        /* Gemini accepts only 'user'/'model' roles, and the first turn must be 'user'.
           Map any legacy 'bot' role to 'model' and drop leading non-user turns. */
        var contents = chatHistory.map(function (m) {
            return { role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] };
        });
        while (contents.length && contents[0].role !== 'user') contents.shift();

        callGemini(key, contents)
        .then(function (data) {
            removeTyping();
            var reply = data.candidates &&
                data.candidates[0] &&
                data.candidates[0].content &&
                data.candidates[0].content.parts &&
                data.candidates[0].content.parts[0] &&
                data.candidates[0].content.parts[0].text;
            var replyText = reply || 'לא התקבלה תשובה. נסה שוב.';
            appendMsg('model', replyText);
        })
        .catch(function (e) {
            removeTyping();
            var msg = e.message || 'שגיאת רשת';
            var errText;
            if (msg.indexOf('free_tier') !== -1 || msg.indexOf('quota') !== -1 || msg.indexOf('limit: 0') !== -1) {
                errText = '⚠️ חשבון העבודה חוסם את ה-free tier. צור מפתח מ-aistudio.google.com/apikey עם Gmail אישי ולחץ 🔑.';
            } else if (msg.indexOf('API_KEY') !== -1 || msg.indexOf('400') !== -1) {
                errText = '🔑 מפתח לא תקין. לחץ 🔑 לעדכן.';
            } else if (msg.indexOf('429') !== -1) {
                errText = '⏳ מגבלת בקשות זמנית. נסה שוב בעוד דקה.';
            } else {
                errText = 'שגיאה: ' + msg;
            }
            appendMsg('model', errText);
        })
        .then(function () {
            sendBtn.disabled = false;
            input.disabled = false;
            input.focus();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }
})();
