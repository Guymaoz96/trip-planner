# Trip planning site

A personal, Hebrew (RTL) trip-planning **PWA**. Per-country day-by-day timeline,
important files & photos per day, shared to-do / budget / packing, live weather,
currency converter, route map, countdown, playlist, and an optional AI chat.

Static site — no build step. Data is saved in the browser and (optionally) synced
across devices via Firebase Firestore.

## Run it

Use a local server (not `file://`, which breaks saving between pages):

```bash
cd <this-folder>
python3 -m http.server 8080
```

Open **http://localhost:8080**.

## Make it yours

This is generated from an **example trip (Italy + Greece)**. Replace the example
content with your trip — the day plan lives in `js/main.js` (`tripData`), and the
home page / country pages / weather / currency / map are edited to match. See the
builder's `references/architecture.md` for the full customization map.

## Optional setup

- **Sync between devices/people** → set up Firebase and paste your config into
  `js/firebase-config.js` (see `references/firebase-setup.md`). Without it, data
  stays in one browser.
- **AI chat** → open the 🤖 bubble and paste your own Google Gemini API key
  (stored only in your browser). See `references/gemini-setup.md`.
- **Public URL** → deploy the folder to Netlify or any static host
  (see `references/deploy-netlify.md`).

No API keys or personal config are stored in these files — you add your own.
