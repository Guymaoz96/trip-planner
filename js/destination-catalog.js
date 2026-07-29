/* Shared metadata for destinations that have no hand-written page of their own —
   the "יעדים נוספים" candidates (pages/more-destinations.html) plus the stops
   that were added to the itinerary later. Used by:
   - js/itinerary-editor.js — the homepage "add destination" picker + preview
   - js/map.js — pin position/color for an entry added to the itinerary
   - pages/country.html — pre-written recommendations, instead of the
     "no tips yet" placeholder
   `mapArea` is the English town appended to the Google-Maps search built from
   a recommendation's place name — see destSearchArea() in js/main.js.
   A fully custom (typed-in) destination has no entry here — that's expected;
   it just won't get a map pin or recs until someone builds a page for it. */
var DESTINATION_CATALOG = [
    {
        id: 'amed', name: 'עמד', defaultNights: 2,
        sourceLabel: '🪸 רוני ושוהם', sourceClass: 'roni',
        title: '🐚 Amed — צפון באלי',
        lead: 'עיירה קטנה ומרגיעה, מושלמת לשנורקלינג וצלילה, עם נוף מושלם של הר הגעש אגונג.',
        pos: [-8.341, 115.653], color: '#f4a261', mapArea: 'Amed, Bali',
        recs: [
            { cls: 'is-info', heading: '💧 בדרך לשם', items: [
                '<b>Tukad Cepung Waterfall</b> — מפל יפייפה שמואר באור דרמטי. חובה עצירה בדרך מאובוד.'
            ] },
            { cls: 'is-stay', heading: '🏨 לינה', items: [
                '<b>Moon Cafe Backpackers</b> — גסטהאוס בסיסי מאוד, זול ואווירה טובה. שירותים ומקלחת משותפים. ~150,000 רופי ללילה (~30 ש״ח).'
            ] },
            { cls: 'is-food', heading: '🏖️ חוף ומסעדות', items: [
                '<b>Lipah Beach</b> — מים צלולים, שונית קרוב לחוף. אפשר לשחות פנימה עם מסכה בלבד.',
                '<b>Blue Earth Village</b> — נוף מושלם ושקיעה מהממת.',
                '<b>Rumba Cafe</b> — ארוחת בוקר טעימה מאוד, עיצוב ירוק, מוזיקה טובה. לא לוותר!'
            ] }
        ]
    },
    {
        id: 'lombok', name: 'קוטה לומבוק', defaultNights: 4,
        sourceLabel: '🪸 רוני ושוהם', sourceClass: 'roni',
        title: '🏄 קוטה לומבוק — גלישה, חופים וטרק רינג׳אני',
        lead: 'האחות השקטה והפחות מתויירת של באלי. גלישת גלים וקייט, אוכל מדהים, וטרק לפסגה וולקנית מטורפת (רינג׳אני, 3,726 מ׳).',
        pos: [-8.897, 116.283], color: '#90e0ef', mapArea: 'Kuta Lombok',
        recs: [
            { cls: 'is-stay', heading: '🏨 לינה בקוטה לומבוק', items: [
                '<b>Merendeng Hostel</b> — ההוסטל הכי משתלם! חדר זוגי פרטי עם מקלחת, ~50 ש״ח ללילה.',
                '<b>Pipes Hostel</b> — דורמס מומלץ.',
                '<b>Raja Hotel Mandalika</b> — נעים לנחיתה, ~130 ש״ח כולל בריכה וארוחת בוקר.',
                '<b>Rascals Kuta Lombok</b> — ריזורט מפנק, ~270 ש״ח, שווה למי שיש תקציב.'
            ] },
            { cls: 'is-food', heading: '🍽️ מסעדות', items: [
                '<b>Thai Thai</b> — המסעדה האהובה עליהם! תאילנדי מדהים, קצת יקר אך שווה.',
                '<b>Ramen Bar</b> — סושי וראמן הכי טעים באי.',
                '<b>Munchies</b>, <b>Milk</b> (בוקר), <b>The Breakery</b>, <b>Pizza Shack</b>, <b>Loka</b> (+חדר כושר).',
                '<b>Neo Kitchen</b> ו-<b>Mama Warung</b> — מקומי וזול, קערת פירות ~4 ש״ח.'
            ] },
            { cls: 'is-info', heading: '🛵 אטרקציות', items: [
                'השכרת אופנוע: <b>Tara Scooter</b> — 60,000 רופי ליום, זול מאוד.',
                'גלישת גלים: מדריך <b>Oki</b> — <a href="tel:082340257366">082340257366</a>. ~80 ש״ח לשיעור / 30 ש״ח השכרת גלשן (שעתיים).',
                'קייטסרפינג: ב-Mandalika (בקוטה) או ב-<b>Kaliantan</b> (כשעה וחצי) — נחשב לאחד המקומות הטובים באינדונזיה.',
                'יוגה: Rascals, Ashtari Yoga Retreat.'
            ] },
            { cls: 'is-info', heading: '🏔️ טרק רינג׳אני (3–4 ימים)', items: [
                'לינה ערב לפני בכפר <b>Sembalun</b> (מלון Sarung) — בסיס היציאה.',
                'יום 1: טיפוס מ-600 ל-2,600 מ׳, לינה באוהלים על ההר (קר מאוד — לשכור מעיל ומקלות הליכה מראש).',
                'יום 2: קימה ב-1:30 בלילה, טיפוס לפסגה לזריחה, ואז ירידה תלולה של 700 מ׳ לאגם ולמעיינות חמים.',
                'יום 3: חזרה לנקודת הלינה — קשה; <b>מומלץ טרק של 4 ימים</b> (לישון ליד האגם ולרדת בנחת).',
                '⚠️ נעליים טובות חובה, להביא חטיפים, הפורטרים סוחבים הכל חוץ מציוד אישי. העלייה תלולה ומחליקה — אתגר אמיתי, לא להקל ראש.'
            ] }
        ]
    },
    {
        id: 'tetebatu', name: 'תטבטו', defaultNights: 2,
        sourceLabel: '🌋 שיר', sourceClass: 'shir',
        title: '🌾 תטבטו — הכפר שבלב לומבוק',
        lead: 'באמצע האי, מתחת להר הגעש רינג׳אני. הכי פחות תיירותי ומאוד אותנטי — אנשים מקסימים ונופים מדהימים.',
        pos: [-8.5606, 116.4092], color: '#b7e4c7', mapArea: 'Tetebatu, Lombok',
        recs: [
            { cls: 'is-info', heading: '🌾 למה להגיע', items: [
                'באמצע האי, עם נוף יפייפה להר הגעש המפורסם <b>Rinjani</b>. הכי פחות תיירותי מכל המקומות בלומבוק ומאוד אותנטי, אנשים מקסימים.',
                'שווה סיור עם מישהו מקומי — זו הדרך לראות את המקום באמת.',
                'ממש יפה להסתובב באזור באופנוע. הנסיעה לכאן באופנוע יכולה להיות קצת מתישה, אבל שווה את הניידות במקום עצמו.',
                '⏱️ 2–3 לילות זה בדיוק — לחקור קצת באופנוע ולעשות סיור עם מקומי.'
            ] }
        ]
    },
    {
        id: 'secretgilis', name: 'Secret Gilis', defaultNights: 2,
        sourceLabel: '🪸 רוני ושוהם', sourceClass: 'roni',
        title: '🌊 Secret Gilis — האיים הדרומיים של לומבוק',
        lead: 'קבוצת איים שקטים ולא מפותחים — שונה לגמרי מהגיליז הצפוניים. פחות נוחות אך שקט אמיתי ומחירים נמוכים.',
        pos: [-8.751, 116.038], color: '#caffbf', mapArea: 'Gili Asahan, Lombok',
        recs: [
            { cls: 'is-stay', heading: '🏨 לינה', items: [
                '<b>Kristal Garden</b> — בעלים מקסים, מסעדה במקום; בלי מים חמים, יתושים בחדר.',
                '<b>Alden Beach House</b> — נעים יותר; גם כאן בלי מים חמים.'
            ] },
            { cls: 'is-food', heading: '🐠 אוכל ושנורקל', items: [
                '<b>SEGARE Restaurant</b> — מקומית, טעימה ונעימה.',
                'שייט שנורקל בין 3 איים (Gili Asahan, Gili Layar, Gili Ringgit) — ~275,000 רופי לאדם (~70 ש״ח), סיור פרטי ורגוע, מים טורקיז.',
                'יומיים וחצי הספיקו — אפשר גם להישאר יותר למי שרוצה להתנתק.'
            ] }
        ]
    },
    {
        id: 'flores', name: 'פלורס', defaultNights: 7,
        sourceLabel: '🪸 רוני ושוהם', sourceClass: 'roni',
        title: '🐉 פלורס — הפנינה האמיתית של אינדונזיה',
        lead: 'פחות מתויר, טבע פראי, חופים בתוליים והצלילות המרגשות ביותר באינדונזיה. מומלץ להקדיש לפחות 10–14 ימים.',
        pos: [-8.487, 119.889], color: '#ffadad', mapArea: 'Labuan Bajo, Flores',
        recs: [
            { cls: 'is-food', heading: '🍽️ מסעדות', items: [
                '<b>Mimamori Cafe</b> — מושלם לקפה וארוחת בוקר.',
                '<b>Happy Banana Komodo</b> — יפנית מעולה.',
                '<b>ALMA</b> ו-<b>Baccalà</b> — איטלקיות טעימות אך יקרות יחסית.'
            ] },
            { cls: 'is-stay', heading: '🏨 לינה זולה', items: [
                '<b>Benedict</b> — הכי זול (~40 ש״ח), אנשים מקסימים, בלי מים חמים.',
                '<b>Villa Tasya</b> — מיקום מעולה ליד הנמל (~50 ש״ח), בלי מים חמים.',
                '<b>De Nata</b> — דורמס פשוטים וטובים.'
            ] },
            { cls: 'is-info', heading: '🐉 סיור קומודו איילנד', items: [
                'חבילת יום (~250 ש״ח לאדם): תצפית על Pulau Padar, חוף ורוד (Pink Beach), שמורת דרקוני קומודו, צלילה עם מנטות ב-Manta Point, ועוד צלילה עם baby shark וצבי ים.',
                'אפשר גם ספארי צלילות של 4 ימים — נחשב לטופ שבטופ באינדונזיה.'
            ] },
            { cls: 'is-info', heading: '🛵 לופ אופנוע עצמאי', items: [
                '<b>Cunca Wulang Waterfall</b> — שעה מהנמל. טיפ: להמשיך 5 דק׳ לכפר לכניסה בחצי מחיר עם מדריך מקומי (פיטר — <a href="tel:0882020159208">0882020159208</a>).',
                'לינה בהמשך: <b>Ruteng</b> (שעתיים נסיעה) — <b>Chacha Dormitory</b>; כפר אותנטי סמוך: Puu Ruteng.',
                '<b>Air Terjun Tengku Less</b> — מפל פרטי ומדהים, שעתיים מרוטנג + 20 דק׳ הליכה.',
                '<b>Spiderweb Rice Fields</b> — שדות אורז בצורת קורי עכביש, שווה מאוד.',
                'אם יש זמן — מומלץ להמשיך ל-Bajawa (הם חזרו ללבואן באג׳ו בגלל לחץ זמנים).'
            ] }
        ]
    }
];
