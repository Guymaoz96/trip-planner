# Indonesia Honeymoon Trip Site

Static Hebrew (RTL) trip-planning PWA for Guy & Adi's honeymoon (19 Jul–14 Aug
2026, Bali/Raja Ampat region). No build step — plain HTML/CSS/JS served as-is.
Deployed at Netlify, source at `github.com/Guymaoz96/trip-planner`.

**All user-facing text is Hebrew RTL.** Keep it that way — don't translate
UI copy to English even when writing code/comments in English.

## Deploy & git workflow

- `main` is connected to Netlify — **every push to `main` auto-deploys to
  production within ~30s.** Opening a session or testing locally never
  touches production; only `git push origin main` does.
- Do non-trivial work on a feature branch, verify in the browser preview,
  then merge to `main` and push only once it's checked. This is the
  established pattern from every past change to this repo.
- Firestore rules on the Firebase project only allow a fixed list of collections
  (see `references/firebase-setup.md`). **If you add a new Firestore
  collection, add its name to that rules list and tell the user to update
  it in the Firebase console** — writes to an unlisted collection fail
  silently (permission-denied, caught and console.warn'd, not thrown).
- Local dev server: `python -m http.server <port> --directory .` (never
  `file://`, breaks cross-page saving). `.claude/launch.json` (one level up,
  at the Desktop) holds the preview config.
- **Local testing gotcha:** the browser aggressively HTTP-caches `<script
  src>` files across repeated `location.reload()` calls during a dev loop —
  editing a `.js` file and reloading the *same* origin/port can silently
  keep running the old version. If behavior looks stale/wrong after an edit,
  don't assume a bug — first `preview_stop` + `preview_start` on a **new
  port** (edit `launch.json`) for a guaranteed-fresh origin before debugging
  further. Lost real time to this once already.

## Architecture — read before editing

`js/main.js` defines the hardcoded default `tripData.countries[]` (id, name,
intro, weeks→days→date/label). This is the single source of truth for the
itinerary, but it is **not directly mutated by the UI** — see below.

### The itinerary editor & override pattern

`js/itinerary-editor.js` lets the user reorder/resize/add/remove destinations
from the homepage (`#countryCards`, edit-mode toggle). It never edits
`main.js` on disk (can't — static site, browser can't write source files).
Instead:

1. On load, it synchronously overwrites `tripData.countries` from
   `localStorage['itinerary_override']` if present (must run before any
   other script reads `tripData.countries`).
2. On any mutation, it calls `recomputeDates()` (contiguous from the fixed
   `TRIP_START`), `saveOverride()` (localStorage + Firestore
   `tripConfig/main` if `db` configured), and dispatches a `tripdatachange`
   CustomEvent on `document`.
3. Everything that displays destinations listens for `tripdatachange` and
   re-renders from `tripData.countries`: `renderCountryCards()` and
   `renderDestNav()` (both in `main.js`), `js/map.js`, `js/budget.js`,
   `js/schedule-view.js`.
   **If you add a new UI surface that shows destinations, wire it to this
   event or it will silently go stale after an edit** — this exact class of
   bug hit the map twice already (pin numbers/dates were static strings,
   and new destinations had no pin at all).
4. `js/destination-catalog.js` holds full data (map position, color,
   description, recommendations) for the 4 "יעדים נוספים" candidates
   (Amed, Lombok, Secret Gilis, Flores) — shared by the add-destination
   picker, the map, and `pages/country.html`. A destination typed in fresh
   (not from this catalog) gets no map pin and no recs — nothing to look up.
5. `pages/country.html?id=<id>` is a **generic template** for any
   destination not in `HANDWRITTEN_PAGES` (main.js) — i.e. anything added
   via the editor that isn't one of the 7 original hand-authored pages
   (`pages/uluwatu.html` etc.). It reads `?id=`, renders hero/day-rail/photos
   dynamically via the same `initCountryPage()` used everywhere, and pulls
   recs from `destination-catalog.js` if the id matches a candidate, else
   shows a "no tips yet" placeholder.
6. **Script load order matters.** `destination-catalog.js` and
   `itinerary-editor.js` must load right after `main.js` and before
   anything that reads `tripData.countries` or `DESTINATION_CATALOG`. Every
   page loads `itinerary-editor.js` (so nav stays in sync everywhere);
   `destination-catalog.js` is only needed on `index.html` and
   `pages/country.html`.

### Nights vs. calendar days

A `day` entry in `tripData` is a **night**, not a calendar day. `days[0].date`
is the check-in date; the stay ends the **morning after the last night**, which
is also the check-in date of the next destination (5 nights from 19.7 → check
out 24.7, and the next place checks in on 24.7). Any date range shown for a
destination must end at `checkoutDate(lastNight)` (`js/main.js`) — used by the
homepage cards, the map popups and the schedule view. Per-day surfaces (the day
rail in `js/country-days.js`) still use the raw day dates.

### Schedule (calendar) view

`js/schedule-view.js` renders the same `tripData.countries` as one continuous
7-column calendar grid (`#scheduleView`) running from check-in to check-out
with no per-month break — the 1st of a month spells its name out inside its
cell instead. Toggled against the cards by the segmented
`#viewSwitch` in the overview header (choice persisted in
`localStorage['home_view_mode']`). One cell per calendar day colored by where
we sleep that night, the check-in day of each destination tagged
"מעבר מ<previous>", plus a final check-out cell. Cell colors come from
`window.STOP_META` (exported by `js/map.js`) then `DESTINATION_CATALOG`, so
pins and calendar always agree; it must load **after** `map.js`. Under 700px
the 7-column grid collapses to a day-per-row list (CSS only).

### Relative paths & the service worker

Root pages (`index.html`, `tips.html`, `todo.html`) link to `pages/x.html`;
pages under `pages/` link to `x.html` — so **any generated link must decide its
depth from `location.pathname`, never from the surrounding markup** (that's
what `renderDestNav()` does). `sw.js` is network-first and used to fall back to
the cached `/index.html` for *any* failed navigation, which rendered the
homepage under a `/pages/…` URL; markup-derived links then produced
`/pages/pages/x.html` 404s. The fallback is now root-only, with an offline
notice for uncached `/pages/` URLs.

### Destination page surfaces (`pages/uluwatu.html` … + `pages/country.html`)

All 8 destination pages share one structure, so page-level features live in
shared modules rather than in 8 copies of markup:

- `js/recs-enhance.js` upgrades the hand-authored `.recs-section` in place —
  category chips, source chips, live search, and Google-Maps links on bold
  place names. It derives everything from the existing classes
  (`.recs-card.is-{food,info,stay}`, `.rec-source--<who>`), so **new
  recommendation cards need those classes or they land in the default
  "attractions" bucket and can't be filtered.** Filtering hides individual
  `<li>`s, then hides any card left empty. Bold runs containing Hebrew
  letters are treated as emphasis, not places, and stay unlinked.
  `pages/country.html` builds its recs at runtime, so it dispatches a
  `recsrendered` event that makes the module re-scan.
- `js/diary.js` renders the narrative trip journal into `#diarySection`
  (see below). Both scripts load after `main.js` on every destination page.
- The day rail auto-opens day 1 on load (`openFirstDay()` in
  `js/country-days.js`) — **desktop only**, since under 720px the detail pane
  is a full-screen overlay that would bury the rail.
- `renderDestNav()` collapses all destinations into one `יעדים` dropdown
  (`li.nav-dest-group`) rather than listing them at the top level. It still
  carries the `nav-dest` class so each re-render clears the previous one.

### The trip diary

`js/diary.js` is deliberately *not* the timeline: the timeline holds the plan
for a day, the diary holds what the place felt like. Free text + who wrote it
(גיא / עדי / שנינו) + an optional mood emoji + a rotating writing prompt.

**Two surfaces, one store.** `initDiary(countryId)` renders the whole diary for
a destination into `#diarySection`; `initDayDiaryPanel(docId, countryId,
dayTag, dayDate)` renders just one day's entries into `#dayDiaryMount`, which
`openDayDetail()` adds under the timeline and files panels (and which
`pages/day.html` mounts too). Both read and write **the same Firestore doc**
`diary/<countryId>` — an entry written from a day just carries a `dayDocId`
(the timeline's doc id, so merged day ranges work) plus a `dayLabel` the
destination view shows as a badge. That means one listener per page instead of
one per day, and the destination page tells the whole story of a place in one
scroll. localStorage (`diary_<countryId>`) is the always-works path.

Each mounted surface keeps its own composer draft, so typing in the day panel
doesn't disturb the destination composer below it. Views whose root has left
the DOM are pruned on every render — day panels are rebuilt each time the
detail pane opens. Destination names come from `tripData` at render time, so
renaming a stop in the itinerary editor renames its diary too.

### Persistence pattern (reused everywhere: budget, todo, packing, timeline)

Always write to `localStorage` first (works with no setup). If
`js/firebase-config.js` has real (non-placeholder) values, also write to
Firestore and prefer it on read via `onSnapshot`. Never make Firestore the
only path — it must degrade gracefully to local-only.

### Attribution system

Recommendation cards (`.recs-card`) carry a `.rec-source` badge
(`--neta` / `--roni` CSS variants) naming which friends' trip story a tip
came from. If a third source is ever added, it needs a new CSS variant in
`css/style.css` — don't reuse an existing color for a different source.

## Known-stale docs

`references/architecture.md` and `README.md` describe the **original
skill-generated template** (e.g. still mention `surf.html`, don't mention
the itinerary editor, `destination-catalog.js`, or `pages/country.html`).
Don't trust them for current architecture — this file supersedes them.
