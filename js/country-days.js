(function() {
    'use strict';

    var MERGES_KEY = 'summer_trip_26_manual_merges';
    var LABELS_KEY = 'summer_trip_26_day_labels';

    var unifyMode = false;
    var labelEditMode = false;
    var selected = {};
    var currentCountryId = '';

    function esc(s) {
        if (s == null) return '';
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function loadJson(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function saveJson(key, obj) {
        try {
            localStorage.setItem(key, JSON.stringify(obj));
        } catch (e) {}
    }

    function getMergesForWeek(countryId, weekNum) {
        var all = loadJson(MERGES_KEY, {});
        var c = all[countryId];
        if (!c) return [];
        var w = c[String(weekNum)];
        return Array.isArray(w) ? w : [];
    }

    function setMergesForWeek(countryId, weekNum, list) {
        var all = loadJson(MERGES_KEY, {});
        if (!all[countryId]) all[countryId] = {};
        all[countryId][String(weekNum)] = list;
        saveJson(MERGES_KEY, all);
    }

    function getLabelOverride(docId) {
        var all = loadJson(LABELS_KEY, {});
        return all[docId] || null;
    }

    function setLabelOverride(docId, text) {
        var all = loadJson(LABELS_KEY, {});
        if (text && String(text).trim()) all[docId] = String(text).trim();
        else delete all[docId];
        saveJson(LABELS_KEY, all);
    }

    function mergedDocId(countryId, weekNum, startDay, endDay) {
        if (startDay === endDay) return getDayDocId(countryId, weekNum, startDay);
        return countryId + '_w' + weekNum + '_m' + startDay + '_' + endDay;
    }

    function overlaps(a, b) {
        return !(a.end < b.start || b.end < a.start);
    }

    function buildSegments(weekDays, merges) {
        var used = {};
        merges.forEach(function(m) {
            for (var n = m.start; n <= m.end; n++) used[n] = true;
        });
        var segments = [];
        merges.slice().sort(function(a, b) { return a.start - b.start; }).forEach(function(m) {
            var days = weekDays.filter(function(d) { return d.dayNum >= m.start && d.dayNum <= m.end; });
            if (days.length) segments.push({ merge: true, days: days, start: m.start, end: m.end });
        });
        weekDays.forEach(function(d) {
            if (!used[d.dayNum]) segments.push({ merge: false, days: [d], start: d.dayNum, end: d.dayNum });
        });
        segments.sort(function(a, b) { return a.start - b.start; });
        return segments;
    }

    function formatDayRangeTitle(startNum, endNum) {
        if (startNum === endNum) return 'יום ' + startNum;
        return 'ימים ' + startNum + '–' + endNum;
    }

    function formatDateRangeFromDays(days) {
        var a = days[0].date ? formatDate(days[0].date) : '';
        var b = days[days.length - 1].date ? formatDate(days[days.length - 1].date) : '';
        if (a && b && a !== b) return a + ' – ' + b;
        return a || b;
    }

    /** מינימלי: מספר יום, תאריך, כותרת בלבד */
    function buildDayCube(countryId, weekNum, seg, cubeIndex) {
        var isGroup = seg.merge && seg.days.length > 1;
        var dayNum = seg.days[0].dayNum;
        var endNum = seg.days[seg.days.length - 1].dayNum;
        var dayTitle = formatDayRangeTitle(seg.start, seg.end);
        var when = formatDateRangeFromDays(seg.days);
        var docId = mergedDocId(countryId, weekNum, seg.start, seg.end);
        var baseLabel = seg.days[0].label;
        var label = getLabelOverride(docId) || baseLabel;
        var badge = isGroup
            ? '<span class="day-cube__badge">' + seg.days.length + ' ימים</span>'
            : '';
        var selKey = 'w' + weekNum + '_' + seg.start + '_' + seg.end;
        var selectedClass = selected[selKey] ? ' day-cube--selected' : '';
        var unifyRing = unifyMode
            ? '<span class="day-cube__select-ring" aria-hidden="true"><span class="day-cube__select-dot"></span></span>'
            : '';

        /* לעולם לא שדות קלט ברשימה — רק כרטיס נקי (עריכת כותרת רק בחלון הפירוט) */
        return (
            '<button type="button" class="day-cube' + (isGroup ? ' day-cube--group' : '') + selectedClass + '" ' +
            'style="--cube-i:' + cubeIndex + '" ' +
            'data-country="' + esc(countryId) + '" data-week="' + esc(String(weekNum)) + '" data-day="' + esc(String(dayNum)) + '" ' +
            'data-sel-key="' + esc(selKey) + '" data-doc-id="' + esc(docId) + '" ' +
            (isGroup ? 'data-day-end="' + esc(String(endNum)) + '" data-is-group="1"' : '') + '>' +
            unifyRing +
            badge +
            '<span class="day-cube__day-line">' + esc(dayTitle) + '</span>' +
            '<span class="day-cube__date-line">' + esc(when) + '</span>' +
            '<span class="day-cube__title-line">' + esc(label) + '</span>' +
            '</button>'
        );
    }

    /* The mobile detail pane is a centred overlay on top of a full-screen
       backdrop (z-index 1390, see style.css). Closing the pane without taking
       the backdrop down left an invisible <button> covering the whole page:
       the screen stayed dimmed and every tap — nav, day cubes, links — hit the
       backdrop instead, so the app looked frozen until it was force-quit. */
    function hideBackdrop() {
        var backdrop = document.getElementById('countryDetailBackdrop');
        if (!backdrop) return;
        backdrop.classList.remove('is-visible');
        backdrop.hidden = true;
        backdrop.onclick = null;
    }

    function closeDetail() {
        if (typeof window.saveTimelineNow === 'function') window.saveTimelineNow();
        var content = document.getElementById('countryDetailContent');
        var empty = document.getElementById('countryDetailEmpty');
        var shell = document.getElementById('countryDetailShell');
        if (shell) shell.classList.remove('is-detail-open');
        hideBackdrop();
        if (content) {
            content.innerHTML = '';
            content.hidden = true;
        }
        if (empty) empty.hidden = false;
        window.__timelineScopeRoot = null;
        window.TIMELINE_DOC_ID = null;
        document.querySelectorAll('.day-cube.is-open').forEach(function(el) { el.classList.remove('is-open'); });
    }

    function openDayDetail(countryId, weekNum, dayNum, cubeEl, isGroup, dayEndNum, noScroll) {
        var result = getDayFromParams(countryId, String(weekNum), String(dayNum));
        if (!result) return;

        if (typeof window.saveTimelineNow === 'function') window.saveTimelineNow();

        var country = result.country;
        var week = result.week;
        var day = result.day;
        var docId = cubeEl && cubeEl.getAttribute('data-doc-id')
            ? cubeEl.getAttribute('data-doc-id')
            : getDayDocId(country.id, week.weekNum, day.dayNum);
        window.TIMELINE_DOC_ID = docId;

        var content = document.getElementById('countryDetailContent');
        var empty = document.getElementById('countryDetailEmpty');
        if (!content) return;

        document.querySelectorAll('.day-cube.is-open').forEach(function(el) { el.classList.remove('is-open'); });
        if (cubeEl) cubeEl.classList.add('is-open');

        var titleLine = country.name + ' · שבוע ' + week.weekNum;
        var subLine = '';
        var displayLabel = getLabelOverride(docId) || day.label;
        if (isGroup && dayEndNum && parseInt(dayEndNum, 10) > day.dayNum) {
            titleLine += ' · ימים ' + day.dayNum + '–' + dayEndNum;
            var last = week.days.find(function(x) { return x.dayNum === parseInt(dayEndNum, 10); });
            subLine = (day.date ? formatDate(day.date) : '') + (last && last.date ? ' – ' + formatDate(last.date) : '');
        } else {
            titleLine += ' · יום ' + day.dayNum;
            subLine = day.date ? formatDate(day.date) : '';
        }

        var titleEditBlock = '';
        if (labelEditMode) {
            titleEditBlock =
                '<div class="country-detail-title-edit">' +
                '<label class="country-detail-title-edit__label" for="countryDayTitleEdit">כותרת / תיאור קצר</label>' +
                '<input type="text" id="countryDayTitleEdit" class="country-detail-title-edit__input" ' +
                'value="' + esc(displayLabel) + '" data-doc-id="' + esc(docId) + '" autocomplete="off">' +
                '</div>';
        } else {
            titleEditBlock = '<p class="day-inline-meta country-detail-desc">' + esc(displayLabel) + '</p>';
        }

        var shell = document.getElementById('countryDetailShell');
        if (shell) shell.classList.add('is-detail-open');

        content.innerHTML =
            '<div class="country-detail-inner">' +
            '<div class="day-inline-header country-detail-header">' +
            '<button type="button" class="day-inline-close" id="countryDetailClose" aria-label="סגור">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
            '</button>' +
            '<h2 class="day-inline-title" id="dayModalTitle">' + esc(titleLine) + '</h2>' +
            (subLine ? '<p class="day-inline-meta country-detail-dates">' + esc(subLine) + '</p>' : '') +
            titleEditBlock +
            (isGroup ? '<p class="day-inline-note">ציר זמן אחד לכל התקופה — ערכו את הפעילויות למטה.</p>' : '') +
            '</div>' +
            '<div class="activities-section country-detail-timeline">' +
            '<h2>תכנית היום – ציר זמן</h2>' +
            '<div class="timeline-container">' +
            '<div class="timeline-line"></div>' +
            '<div id="timelinePlaceholder"><p class="section-intro">אין עדיין פריטים. הפעילו מצב עריכה כדי להוסיף פעילויות.</p></div>' +
            '</div></div>' +
            '<div id="dayFilesMount" class="day-files-section"></div>' +
            '<div id="dayDiaryMount" class="day-diary-section"></div>' +
            '</div>';

        window.__timelineScopeRoot = content;
        content.hidden = false;
        if (empty) empty.hidden = true;

        var closeBtn = document.getElementById('countryDetailClose');
        if (closeBtn) closeBtn.onclick = closeDetail;

        var titleInp = document.getElementById('countryDayTitleEdit');
        if (titleInp) {
            titleInp.addEventListener('blur', function() {
                var id = titleInp.getAttribute('data-doc-id');
                if (id) setLabelOverride(id, titleInp.value);
                renderRail(currentCountryId);
            });
            titleInp.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') { e.preventDefault(); titleInp.blur(); }
            });
        }

        if (typeof window.initTimelinePanel === 'function') window.initTimelinePanel();
        if (typeof window.initDayFilesPanel === 'function') window.initDayFilesPanel(docId);
        if (typeof window.initDayDiaryPanel === 'function') {
            /* Short tag ("יום 3" / "ימים 3–5") — the destination diary shows it
               as a badge so you can tell which day an entry came from. */
            var dayTag = (isGroup && dayEndNum && parseInt(dayEndNum, 10) > day.dayNum)
                ? 'ימים ' + day.dayNum + '–' + dayEndNum
                : 'יום ' + day.dayNum;
            window.initDayDiaryPanel(docId, country.id, dayTag, day.date || '');
        }

        var backdrop = document.getElementById('countryDetailBackdrop');
        if (backdrop && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 720px)').matches) {
            backdrop.hidden = false;
            backdrop.classList.add('is-visible');
            backdrop.onclick = function() { closeDetail(); };
        } else {
            hideBackdrop();
        }

        if (noScroll) return;
        requestAnimationFrame(function() {
            if (cubeEl && typeof cubeEl.scrollIntoView === 'function') {
                cubeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
            var shell = document.getElementById('countryDetailShell');
            if (shell && typeof shell.scrollIntoView === 'function') {
                shell.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        });
    }

    function onDayClick(ev) {
        var cube = ev.target.closest('.day-cube');
        if (!cube) return;
        var countryId = cube.getAttribute('data-country');
        var weekNum = cube.getAttribute('data-week');
        var dayNum = cube.getAttribute('data-day');
        var isGroup = cube.getAttribute('data-is-group') === '1';
        var dayEnd = cube.getAttribute('data-day-end') || '';
        var selKey = cube.getAttribute('data-sel-key') || '';

        if (unifyMode) {
            ev.preventDefault();
            if (selected[selKey]) delete selected[selKey];
            else selected[selKey] = { countryId: countryId, weekNum: parseInt(weekNum, 10), cube: cube };
            cube.classList.toggle('day-cube--selected', !!selected[selKey]);
            updateUnifyBar();
            return;
        }

        openDayDetail(countryId, weekNum, dayNum, cube, isGroup, dayEnd);
    }

    function updateUnifyBar() {
        var bar = document.getElementById('countryUnifyBar');
        var countEl = document.getElementById('countryUnifyCount');
        if (!bar || !countEl) return;
        var n = Object.keys(selected).length;
        countEl.textContent = n ? n + ' ימים נבחרו' : '';
        bar.hidden = !unifyMode;
    }

    function parseSelKey(key) {
        var m = /^w(\d+)_(\d+)_(\d+)$/.exec(key);
        if (!m) return null;
        return { weekNum: parseInt(m[1], 10), start: parseInt(m[2], 10), end: parseInt(m[3], 10) };
    }

    function confirmUnify() {
        var keys = Object.keys(selected);
        if (keys.length < 2) {
            alert('בחרו לפחות שני ימים לאיחוד.');
            return;
        }
        var first = selected[keys[0]];
        var weekNum = first.weekNum;
        var countryId = first.countryId;
        var ranges = [];
        keys.forEach(function(k) {
            var p = parseSelKey(k);
            if (p && p.weekNum === weekNum) ranges.push({ start: p.start, end: p.end });
        });
        if (ranges.length < 2) {
            alert('בחרו ימים מאותו שבוע בלבד.');
            return;
        }
        ranges.sort(function(a, b) { return a.start - b.start; });
        var i = 0;
        while (i < ranges.length - 1) {
            if (ranges[i + 1].start > ranges[i].end + 1) {
                alert('ניתן לאחד רק ימים רצופים (ללא פערים).');
                return;
            }
            i++;
        }
        var mergedStart = ranges[0].start;
        var mergedEnd = ranges[ranges.length - 1].end;

        var newbie = { start: mergedStart, end: mergedEnd };
        var existing = getMergesForWeek(countryId, weekNum);
        var filtered = existing.filter(function(m) {
            return !overlaps(m, newbie);
        });
        filtered.push(newbie);
        filtered.sort(function(a, b) { return a.start - b.start; });
        setMergesForWeek(countryId, weekNum, filtered);

        unifyMode = false;
        selected = {};
        var uBtn = document.getElementById('countryBtnUnify');
        if (uBtn) uBtn.classList.remove('active');
        renderToolbar();
        renderRail(currentCountryId);
    }

    function exitUnifyMode() {
        unifyMode = false;
        selected = {};
        var btn = document.getElementById('countryBtnUnify');
        if (btn) btn.classList.remove('active');
        updateUnifyBar();
        renderRail(currentCountryId);
    }

    function toggleUnifyMode() {
        unifyMode = !unifyMode;
        selected = {};
        var btn = document.getElementById('countryBtnUnify');
        if (btn) btn.classList.toggle('active', unifyMode);
        updateUnifyBar();
        renderRail(currentCountryId);
    }

    function toggleLabelEditMode() {
        labelEditMode = !labelEditMode;
        var content = document.getElementById('countryDetailContent');
        var wasOpen = content && !content.hidden;
        var savedDoc = window.TIMELINE_DOC_ID;
        renderToolbar();
        renderRail(currentCountryId);
        if (wasOpen && savedDoc) {
            var cube = [].find.call(document.querySelectorAll('.day-cube'), function(b) {
                return b.getAttribute('data-doc-id') === savedDoc;
            });
            if (cube) {
                openDayDetail(
                    cube.getAttribute('data-country'),
                    cube.getAttribute('data-week'),
                    cube.getAttribute('data-day'),
                    cube,
                    cube.getAttribute('data-is-group') === '1',
                    cube.getAttribute('data-day-end') || ''
                );
            }
        }
    }

    function renderToolbar() {
        var mount = document.getElementById('countryToolbarMount');
        if (!mount) return;
        mount.innerHTML =
            '<div class="country-page-toolbar">' +
            '<button type="button" id="countryBtnEditLabels" class="country-toolbar-btn country-toolbar-btn--edit' + (labelEditMode ? ' active' : '') + '">' +
            'מצב עריכה כותרת ✏️</button>' +
            '<button type="button" id="countryBtnUnify" class="country-toolbar-btn country-toolbar-btn--unify' + (unifyMode ? ' active' : '') + '">אחד ימים</button>' +
            '</div>' +
            '<div id="countryUnifyBar" class="country-unify-bar"' + (unifyMode ? '' : ' hidden') + '>' +
            '<span id="countryUnifyCount">' + (Object.keys(selected).length ? Object.keys(selected).length + ' ימים נבחרו' : '') + '</span>' +
            '<div class="country-unify-bar__actions">' +
            '<button type="button" class="country-unify-confirm" id="countryUnifyConfirm">אחד</button>' +
            '<button type="button" class="country-unify-cancel" id="countryUnifyCancel">ביטול</button>' +
            '</div></div>';

        document.getElementById('countryBtnEditLabels').addEventListener('click', toggleLabelEditMode);
        document.getElementById('countryBtnUnify').addEventListener('click', toggleUnifyMode);
        document.getElementById('countryUnifyConfirm').onclick = confirmUnify;
        document.getElementById('countryUnifyCancel').onclick = exitUnifyMode;
        updateUnifyBar();
    }

    function renderRail(countryId) {
        var mount = document.getElementById('countryRailMount');
        if (!mount || !tripData || !tripData.countries) return;
        var country = tripData.countries.find(function(c) { return c.id === countryId; });
        if (!country) return;

        var cubeIndex = 0;
        var weeksHtml = country.weeks.map(function(week) {
            var title = week.label || ('שבוע ' + week.weekNum);
            var merges = getMergesForWeek(countryId, week.weekNum);
            var segments = buildSegments(week.days, merges);
            var cubes = segments.map(function(seg) {
                var h = buildDayCube(countryId, week.weekNum, seg, cubeIndex);
                cubeIndex++;
                return h;
            }).join('');
            return (
                '<section class="country-rail-week">' +
                '<h3 class="country-rail-week__title">' + esc(title) + '</h3>' +
                '<div class="country-rail-week__cubes">' + cubes + '</div>' +
                '</section>'
            );
        }).join('');

        mount.innerHTML = '<div class="country-rail-inner">' + weeksHtml + '</div>';
    }

    function renderCountry(countryId) {
        currentCountryId = countryId;
        renderToolbar();
        renderRail(countryId);
    }

    /* Landing on an empty "בחרו יום" pane wasted the most valuable slot on the
       page, so day 1 opens itself. Desktop only: under 720px the detail pane is
       a full-screen overlay with a backdrop (see the media query in style.css),
       and auto-opening it would bury the rail the user came to browse. */
    function openFirstDay() {
        if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 720px)').matches) return;
        var cube = document.querySelector('#countryRailMount .day-cube');
        if (!cube) return;
        openDayDetail(
            cube.getAttribute('data-country'),
            cube.getAttribute('data-week'),
            cube.getAttribute('data-day'),
            cube,
            cube.getAttribute('data-is-group') === '1',
            cube.getAttribute('data-day-end') || '',
            true
        );
    }

    function initCountryPage(countryId) {
        currentCountryId = countryId;
        if (!document.getElementById('countryRailMount')) {
            var legacy = document.getElementById('countryDaysMount');
            if (legacy) {
                legacy.innerHTML = '<p class="section-intro">יש לעדכן את עמוד המדינה (מבנה HTML חדש). פתחו את הקובץ מהפרויקט.</p>';
            }
            return;
        }
        renderCountry(countryId);
        var rail = document.getElementById('countryRailMount');
        if (rail) {
            rail.addEventListener('click', onDayClick);
            rail.addEventListener('keydown', function(ev) {
                if (ev.key !== 'Enter' && ev.key !== ' ') return;
                var cube = ev.target.closest('.day-cube');
                if (!cube) return;
                ev.preventDefault();
                onDayClick({ target: cube });
            });
        }
        openFirstDay();
        if (!window.__countryPageEscapeBound) {
            window.__countryPageEscapeBound = true;
            document.addEventListener('keydown', function(ev) {
                if (ev.key !== 'Escape') return;
                var c = document.getElementById('countryDetailContent');
                if (c && !c.hidden) closeDetail();
            });
        }
    }

    window.initCountryPage = initCountryPage;
    window.closeCountryDayModal = closeDetail;
})();
