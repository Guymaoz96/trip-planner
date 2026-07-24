/* ─────────────────────────────────────────────────────────────────────────
   TRIP DATA — EXAMPLE. Replace the whole `tripData` object below with the
   real trip (countries → weeks → days). The rest of the file is generic and
   should not need changes.

   Model:
     countries[]            – one entry per country/region, in travel order
       id                   – lowercase slug, must match the page file name
                              (e.g. id 'italy'  → pages/italy.html)
       name                 – display name (Hebrew)
       intro                – one-line summary shown on the home cards
       weeks[]              – group days into sensible sections
         weekNum            – 1,2,3… (unique within the country)
         label              – section title (optional)
         days[]
           dayNum           – running number across the whole country (1,2,3…)
           date             – 'YYYY-MM-DD'
           label            – short title for the day

   The per-day timeline, photos, files, to-do, budget and packing are entered
   by the user inside the running site (saved to Firestore/localStorage) — they
   are NOT part of this file.
   ───────────────────────────────────────────────────────────────────────── */
const tripData = {
    countries: [
        {
            id: 'uluwatu',
            name: 'אולוואטו',
            intro: 'נחיתה בבאלי — עיירת גלישה אווירתית, חופים מהממים ושקיעות. נקודת הפתיחה.',
            weeks: [
                {
                    weekNum: 1,
                    label: 'אולוואטו',
                    days: [
                        { dayNum: 1, date: '2026-07-19', label: 'נחיתה בבאלי + הגעה לאולוואטו' },
                        { dayNum: 2, date: '2026-07-20', label: 'חופים: Dreamland / Balangan' },
                        { dayNum: 3, date: '2026-07-21', label: 'Melasti + מקדש אולוואטו לשקיעה' },
                        { dayNum: 4, date: '2026-07-22', label: 'גלישה/צ׳יל + שוק Hatch בערב' },
                        { dayNum: 5, date: '2026-07-23', label: 'יום אחרון באולוואטו' }
                    ]
                }
            ]
        },
        {
            id: 'nusa',
            name: 'נוסה',
            intro: 'נוסה למבונגן, פנידה וצ׳נינגן — מנטות, חופים דרמטיים וגשר צהוב.',
            weeks: [
                {
                    weekNum: 1,
                    label: 'נוסה',
                    days: [
                        { dayNum: 1, date: '2026-07-24', label: 'מעבר מאולוואטו + מעבורת לנוסה למבונגן' },
                        { dayNum: 2, date: '2026-07-25', label: 'צלילות/שנורקל: Manta Point + Crystal Bay' },
                        { dayNum: 3, date: '2026-07-26', label: 'מעבר לנוסה פנידה' },
                        { dayNum: 4, date: '2026-07-27', label: 'פנידה: Kelingking + Diamond Beach' }
                    ]
                }
            ]
        },
        {
            id: 'sideman',
            name: 'סידמן',
            intro: 'כפר קטן ורגוע — אינסוף טרסות אורז וג׳ונגל. שקט מוחלט.',
            weeks: [
                {
                    weekNum: 1,
                    label: 'סידמן',
                    days: [
                        { dayNum: 1, date: '2026-07-28', label: 'מעבר מנוסה לסידמן (Vishala)' },
                        { dayNum: 2, date: '2026-07-29', label: 'טרסות אורז + מפל Gembleng באופנוע' },
                        { dayNum: 3, date: '2026-07-30', label: 'סדנת בישול (Padarama) + צ׳יל בבריכה' }
                    ]
                }
            ]
        },
        {
            id: 'gili',
            name: 'גילי אייר',
            intro: 'אי קטן וכיפי — מסעדות, ברים ושנורקל עם צבים. בלי מכוניות.',
            weeks: [
                {
                    weekNum: 1,
                    label: 'גילי אייר',
                    days: [
                        { dayNum: 1, date: '2026-07-31', label: 'מעבורת מסידמן לגילי אייר (Villa Bagus)' },
                        { dayNum: 2, date: '2026-08-01', label: 'שנורקל צבים (Biba Beach) + יוגה ב-H2O' },
                        { dayNum: 3, date: '2026-08-02', label: 'יום חופשי באי' }
                    ]
                }
            ]
        },
        {
            id: 'lombok',
            name: 'לומבוק',
            intro: 'האי השכן הפראי — חופים ריקים, גלישה בקוטה לומבוק ומפלים בפנים האי.',
            weeks: [
                {
                    weekNum: 1,
                    label: 'לומבוק',
                    days: [
                        { dayNum: 1, date: '2026-08-03', label: 'מעבר מגילי אייר ללומבוק' },
                        { dayNum: 2, date: '2026-08-04', label: 'חופים: Selong Belanak / Tanjung Aan' },
                        { dayNum: 3, date: '2026-08-05', label: 'גלישה/צ׳יל בקוטה לומבוק' },
                        { dayNum: 4, date: '2026-08-06', label: 'מפלים בפנים האי' },
                        { dayNum: 5, date: '2026-08-07', label: 'יום חופשי' },
                        { dayNum: 6, date: '2026-08-08', label: 'יום אחרון בלומבוק' }
                    ]
                }
            ]
        },
        {
            id: 'munduk',
            name: 'מונדוק',
            intro: 'הרים, אגמים ואינסוף מפלים — בקתות באוויר קריר. רומנטי ושקט.',
            weeks: [
                {
                    weekNum: 1,
                    label: 'מונדוק',
                    days: [
                        { dayNum: 1, date: '2026-08-09', label: 'חזרה לבאלי + נסיעה למונדוק (Munduk Cabins)' },
                        { dayNum: 2, date: '2026-08-10', label: 'מקדש Ulun Danu + מפל Banyumala + Munduk Escape' }
                    ]
                }
            ]
        },
        {
            id: 'ubud',
            name: 'אובוד',
            intro: 'לב התרבות של באלי — שווקים, טרסות אורז וריזורט ג׳ונגל לסיום. זריחה בבטור.',
            weeks: [
                {
                    weekNum: 1,
                    label: 'אובוד',
                    days: [
                        { dayNum: 1, date: '2026-08-11', label: 'נסיעה לאובוד — Art Market + Ubud Palace' },
                        { dayNum: 2, date: '2026-08-12', label: 'Pyramids of Chi (sound healing) + Tropical' },
                        { dayNum: 3, date: '2026-08-13', label: 'Kayon Jungle Resort + זריחה בבטור · טיסה הביתה למחרת' }
                    ]
                }
            ]
        }
    ]
};

/* Ids with a hand-authored pages/<id>.html file. Any other id (added via the
   homepage itinerary editor) falls back to the generic pages/country.html?id=
   template instead. */
const HANDWRITTEN_PAGES = ['uluwatu', 'rajaampat', 'sideman', 'gili', 'nusa', 'munduk', 'ubud'];

/* '' when the current document is served from /pages/, 'pages/' at the root.
   Every generated link must go through this — see the "Relative paths & the
   service worker" note in CLAUDE.md for the 404 that markup-based detection
   caused. */
function sitePagesPrefix() {
    return /\/pages\//.test((typeof location !== 'undefined' && location.pathname) || '') ? '' : 'pages/';
}

function countryHref(id, pagesPrefix) {
    var file = HANDWRITTEN_PAGES.indexOf(id) !== -1 ? (id + '.html') : ('country.html?id=' + encodeURIComponent(id));
    return pagesPrefix + file;
}

function getDayDocId(countryId, weekNum, dayNum) {
    return countryId + '_w' + weekNum + '_d' + dayNum;
}

function getDayFromParams(countryId, weekNum, dayNum) {
    const country = tripData.countries.find(c => c.id === countryId);
    if (!country) return null;
    const week = country.weeks.find(w => w.weekNum === parseInt(weekNum, 10));
    if (!week) return null;
    const day = week.days.find(d => d.dayNum === parseInt(dayNum, 10));
    return day ? { country, week, day } : null;
}

function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    if (!hamburger || !navMenu) return;
    hamburger.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        hamburger.setAttribute('aria-expanded', navMenu.classList.contains('active'));
    });
    document.addEventListener('click', function(e) {
        if (navMenu.classList.contains('active') && !navMenu.contains(e.target) && !hamburger.contains(e.target)) {
            navMenu.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
        }
    });
}

function setActiveNav(href) {
    const path = href || (typeof window !== 'undefined' && window.location.pathname) || '';
    document.querySelectorAll('.nav-menu a').forEach(function(a) {
        const linkPath = a.getAttribute('href') || '';
        const isActive = path === linkPath || (path.endsWith(linkPath) && linkPath !== 'index.html' && linkPath !== '.');
        a.classList.toggle('active', isActive);
    });
}

function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

/* Cards always include the edit-row/drag-handle/order-badge markup; CSS
   shows/hides them based on an "is-editing" class the itinerary editor
   toggles on the container — this function itself doesn't need to know
   whether edit mode is on. */
function renderCountryCards() {
    const container = document.getElementById('countryCards');
    if (!container || !tripData.countries) return;
    const countries = tripData.countries;
    container.innerHTML = countries.map(function (c, i) {
        var days = [];
        c.weeks.forEach(function (w) { days = days.concat(w.days); });
        var nights = days.length;
        var metaLine = '';
        if (days.length && days[0].date && days[days.length - 1].date) {
            metaLine = formatDate(days[0].date) + ' – ' + formatDate(checkoutDate(days[days.length - 1].date)) + ' · ' + nights + ' לילות';
        }
        var introHtml = c.intro ? '<p class="country-card__intro">' + escapeHtml(c.intro) + '</p>' : '';
        return (
            '<div class="country-card" data-idx="' + i + '">' +
            '<span class="country-card__order">' + (i + 1) + '</span>' +
            '<a class="country-card__link" href="' + escapeHtml(countryHref(c.id, sitePagesPrefix())) + '">' +
            '<h3>' + escapeHtml(c.name) + '</h3>' +
            '<p class="country-card__meta">' + escapeHtml(metaLine) + '</p>' +
            introHtml +
            '</a>' +
            '<div class="country-card__edit-row">' +
            '<button type="button" class="country-card__drag" title="גרור לסידור מחדש" aria-label="גרור לסידור מחדש">⠿</button>' +
            '<label class="country-card__nights-label">לילות ' +
            '<input type="number" class="country-card__nights-input" min="1" value="' + nights + '"></label>' +
            '<button type="button" class="edit-btn country-card__up" title="הזז מעלה" aria-label="הזז מעלה"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
            '<button type="button" class="edit-btn country-card__down" title="הזז מטה" aria-label="הזז מטה"' + (i === countries.length - 1 ? ' disabled' : '') + '>▼</button>' +
            '<button type="button" class="delete-btn country-card__remove" title="הסר יעד" aria-label="הסר יעד">🗑️</button>' +
            '</div>' +
            '</div>'
        );
    }).join('');
}

function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isoAddDays(iso, delta) {
    if (!iso) return '';
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    /* Local components, not toISOString() (UTC) — same reason as
       recomputeDates() in js/itinerary-editor.js. */
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/* A `day` entry in tripData is a NIGHT, not a calendar day: days[0].date is
   the check-in date and the stay ends the MORNING AFTER the last night — which
   is also the check-in date of the next destination. Any date range shown for
   a destination must therefore end at lastNight + 1, otherwise every stay
   looks a night short and consecutive destinations look like they don't
   touch. */
function checkoutDate(lastNightIso) {
    return isoAddDays(lastNightIso, 1);
}

/* Renders just the destination <li class="nav-dest"> slice of #navMenu from
   tripData.countries, leaving the fixed items (home/tips/todo/etc) untouched.

   The root-vs-pages/ depth comes from location.pathname, NOT from the markup:
   relative hrefs resolve against the URL the document was served at, so the
   URL is the only reliable source. Reading it off the "home" link used to
   produce pages/pages/x.html 404s whenever a document was served under a
   /pages/ URL with the homepage's markup — which the service worker's offline
   fallback did (see sw.js). */
function renderDestNav() {
    const nav = document.getElementById('navMenu');
    if (!nav || !tripData.countries) return;
    const homeLink = nav.querySelector('a[href="index.html"], a[href="../index.html"]');
    const pagesPrefix = sitePagesPrefix();
    const currentId = (function () {
        const m = /\/pages\/([a-z0-9-]+)\.html$/i.exec(location.pathname);
        if (m && HANDWRITTEN_PAGES.indexOf(m[1]) !== -1) return m[1];
        const params = new URLSearchParams(location.search || '');
        return params.get('id') || '';
    })();

    /* Also clears the static <li class="nav-dest"> markup the pages ship with. */
    nav.querySelectorAll('li.nav-dest').forEach(function (li) { li.remove(); });
    const homeLi = homeLink ? homeLink.closest('li') : null;

    /* The 7+ destinations live in one collapsible "יעדים" group instead of
       sitting at the top level — otherwise the mobile drawer is a 13-item
       scroll. The group keeps the .nav-dest class so the line above still
       cleans it up on the next re-render. */
    const group = document.createElement('li');
    group.className = 'nav-dest nav-dest-group';

    const current = tripData.countries.find(function (c) { return c.id === currentId; });
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-dest-toggle' + (current ? ' active' : '');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span class="nav-dest-toggle__label"></span><span class="nav-dest-caret" aria-hidden="true"></span>';
    toggle.querySelector('.nav-dest-toggle__label').textContent = current ? current.name : 'יעדים';

    const sub = document.createElement('ul');
    sub.className = 'nav-subnav';
    tripData.countries.forEach(function (c, i) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = countryHref(c.id, pagesPrefix);
        if (c.id === currentId) a.className = 'active';
        /* The itinerary is ordered, so number the stops — it doubles as a
           reminder of where each place falls in the trip. */
        a.innerHTML = '<span class="nav-subnav__num"></span><span class="nav-subnav__name"></span>';
        a.querySelector('.nav-subnav__num').textContent = i + 1;
        a.querySelector('.nav-subnav__name').textContent = c.name;
        li.appendChild(a);
        sub.appendChild(li);
    });

    group.appendChild(toggle);
    group.appendChild(sub);

    toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        const open = group.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function (e) {
        if (group.classList.contains('is-open') && !group.contains(e.target)) {
            group.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
        }
    });

    if (homeLi && homeLi.nextSibling) homeLi.parentNode.insertBefore(group, homeLi.nextSibling);
    else if (homeLi) homeLi.parentNode.appendChild(group);
    else nav.insertBefore(group, nav.firstChild);
}

/* Updates the homepage hero-dates/hero-subtitle and the "X ימים · Y יעדים"
   heading from tripData.countries instead of hardcoded text. No-op on pages
   without these elements. */
function renderTripSummary() {
    const countries = tripData.countries || [];
    const totalNights = countries.reduce(function (sum, c) {
        return sum + c.weeks.reduce(function (s, w) { return s + w.days.length; }, 0);
    }, 0);

    const datesEl = document.querySelector('.hero-dates');
    if (datesEl) {
        const firstDay = countries[0] && countries[0].weeks[0] && countries[0].weeks[0].days[0];
        const lastCountry = countries[countries.length - 1];
        const lastWeek = lastCountry && lastCountry.weeks[lastCountry.weeks.length - 1];
        const lastDay = lastWeek && lastWeek.days[lastWeek.days.length - 1];
        if (firstDay && lastDay && firstDay.date && lastDay.date) {
            const endDate = new Date(lastDay.date + 'T12:00:00');
            endDate.setDate(endDate.getDate() + 1);
            datesEl.textContent = formatDate(firstDay.date) + ' – ' + endDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + (totalNights + 1) + ' ימים';
        }
    }

    const subtitleEl = document.querySelector('.hero-subtitle');
    if (subtitleEl) {
        subtitleEl.textContent = 'גיא & עדי · ' + countries.map(function (c) { return c.name; }).join(' · ');
    }

    const overviewH2 = document.querySelector('.overview h2');
    if (overviewH2) {
        overviewH2.textContent = (totalNights + 1) + ' ימים · ' + countries.length + ' יעדים';
    }
}
