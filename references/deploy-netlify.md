# Running the site — locally or with a public URL

## Option A — Run locally (no URL, no hosting)

Simplest. Good for one device, or before deploying.

```
cd <project-folder>
python3 -m http.server 8080
```

Open **http://localhost:8080**. Do **not** double-click `index.html`
(`file://` breaks saving between pages).

- Data saves in that browser. To sync between devices, set up Firebase
  (see `firebase-setup.md`) — needed for phones/other people to share data.

## Option B — Free public URL with Netlify (drag & drop)

Fastest way to a shareable link, no account juggling.

1. Go to https://app.netlify.com/drop
2. Drag the **whole project folder** onto the page.
3. Netlify gives you a URL like `https://<random-name>.netlify.app`.
   Rename it in **Site settings → Change site name**.

Included `netlify.toml` sets sensible defaults. That's it.

## Option C — Netlify + GitHub (auto-deploy on every change)

1. Put the project in a GitHub repo (private is fine).
2. Netlify → **Add new site → Import from Git** → pick the repo.
3. Build command: none. Publish directory: `.` (root).
4. Every push auto-deploys.

## Other hosts

Any static host works (GitHub Pages, Vercel, Cloudflare Pages, Firebase
Hosting). Just publish the folder as-is — there is no build step.

## PWA / install

`manifest.json` + `sw.js` make it installable ("Add to Home Screen") and usable
offline. `sw.js` is **network-first**: online it always loads the latest; offline
it falls back to cache. After changing files, bump `CACHE` in `sw.js`
(`trip-v1` → `trip-v2`) so visitors get the update.
