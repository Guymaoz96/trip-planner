# Architecture & customization map

A static, Hebrew (RTL) PWA. No build step, no backend of its own. Data the
traveler enters (timeline, files, photos, to-do, budget, packing) is saved in
the browser (localStorage) and — if the traveler configures Firebase — synced
across devices/people via Firestore. The Gemini API key for the chat is entered
in the running site and stored only in that browser. **No secrets live in code.**

## File-by-file — what to customize per trip

Everything below lives under `assets/template/` in the skill; copy it to the new
project folder, then edit the trip-specific parts. Files marked **generic** are
copied as-is.

| File | Change per trip? | What to change |
|------|------------------|----------------|
| `js/main.js` | **Yes (core)** | The `tripData` object: countries → weeks → days. `id` is a slug that must match the country page filename. |
| `index.html` | **Yes** | `<title>`, hero title/dates/subtitle, "X מדינות" line, nav `<li>` per country, weather `.wx-card`s (ids `wx-<id>`), currency `.fx-result`s (ids `fx<CODE>`), emergency cards. |
| `pages/<id>.html` | **Yes** | One per country. Copy an example page, set title, active nav link, breadcrumb, hero title/lead, `initCountryPage('<id>')`, and `data-country` on `#photoWall`. |
| `js/weather.js` | **Yes** | `CITIES[]` — one per weather card, `id` matches `wx-<id>` in index.html. |
| `js/currency.js` | **Yes** | `CURRENCIES[]` — one per `.fx-result`, `elId` matches `fx<CODE>`. |
| `js/map.js` | **Yes** | `stops[]` — `[lat,lon]`, label, dates, per destination. |
| `js/budget.js` | **Yes** | `COUNTRIES[]` — one tab per country; `key` = country id. |
| `js/ai-chat.js` | **Yes** | `SYSTEM_PROMPT` — short trip summary so the assistant is relevant. (No API key here — entered at runtime.) |
| `js/countdown.js` | **Yes** | `target` = trip's first day. |
| `manifest.json` | **Yes** | `name`, `short_name`, `description`. |
| `sw.js` | **Yes** | `ASSETS[]` — list each country page; bump `CACHE` on every change. |
| `surf.html` | Optional | Replace example spots, or delete the page + its nav links if not relevant. |
| `pages/day.html` | Nav only | Full-page day view; update nav country links. |
| `pages/budget.html`, `pages/packing.html`, `todo.html` | Nav only | Update nav country links. |
| `js/firebase-config.js` | By the traveler | Placeholder by default → site runs on localStorage. Traveler pastes real config to enable sync (see firebase-setup.md). |
| `css/style.css` | **generic** | — |
| `js/edit-mode.js`, `country-days.js`, `day-files.js`, `photos.js`, `todo.js`, `packing.js` | **generic** | — |
| `netlify.toml`, `icons/icon.svg` | **generic** | — |

## Data model (`tripData` in main.js)

```
countries[]         id (slug), name, intro, weeks[]
  weeks[]           weekNum, label, days[]
    days[]          dayNum (running across the country), date 'YYYY-MM-DD', label
```

The per-day **timeline** items, **files**, **photos**, and the **to-do /
budget / packing** lists are entered inside the running site and stored by a
`docId` derived from `country_wWEEK_dDAY` — they are never written into the code.

## How saving works

- No Firebase configured → data saved in the browser only (localStorage /
  sessionStorage). Works fully on one device; nothing is shared.
- Firebase configured → the same data also syncs live via Firestore, so two
  phones (or two people) see the same timeline/to-do/photos/files.
- Firestore collections used: `timeline`, `dayFiles`, `photos`, `todo`,
  `budget`, `packing`. All keyed by trip content, none by identity.

## Serving locally

Open via a local server (not `file://`, which breaks saving between pages):

```
cd <project>
python3 -m http.server 8080   # then open http://localhost:8080
```
