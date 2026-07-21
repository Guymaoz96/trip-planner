/* Bump CACHE (…-v1 → -v2 → …) whenever you change files, to invalidate old caches. */
var CACHE = 'trip-v6';
/* Core files to pre-cache for offline use. Add one line per country page. */
var ASSETS = [
  '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/js/countdown.js',
  '/js/currency.js',
  '/js/ai-chat.js',
  '/js/edit-mode.js',
  '/js/country-days.js',
  '/js/day-files.js',
  '/js/map.js',
  '/js/weather.js',
  '/js/destination-catalog.js',
  '/js/itinerary-editor.js',
  '/js/schedule-view.js',
  '/pages/uluwatu.html',
  '/pages/rajaampat.html',
  '/pages/sideman.html',
  '/pages/gili.html',
  '/pages/nusa.html',
  '/pages/munduk.html',
  '/pages/ubud.html',
  '/pages/country.html',
  '/pages/day.html',
  '/pages/more-destinations.html',
  '/pages/packing.html',
  '/pages/budget.html',
  '/tips.html',
  '/todo.html'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Network-first: always fetch the latest when online (so updates show up
   immediately), fall back to cache only when the network is unavailable. */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  if (e.request.url.indexOf('firestore') !== -1 || e.request.url.indexOf('googleapis') !== -1) return;
  e.respondWith(
    fetch(e.request).then(function (resp) {
      var clone = resp.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, clone); });
      return resp;
    }).catch(function () {
      return caches.match(e.request).then(function (cached) {
        if (cached) return cached;
        var url = new URL(e.request.url);
        /* pages/country.html?id=x and pages/day.html?… are cached per full
           URL, so retry without the query string before giving up. */
        return caches.match(url.origin + url.pathname).then(function (byPath) {
          if (byPath) return byPath;
          /* Serving /index.html under a /pages/… URL used to render the
             homepage while its relative links resolved against /pages/ —
             every destination tab then pointed at /pages/pages/x.html (404).
             Only use the homepage as a fallback for root-level URLs. */
          if (url.pathname.indexOf('/pages/') === -1) return caches.match('/index.html');
          return new Response(
            '<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8">' +
            '<title>אין חיבור</title><body style="font-family:sans-serif;text-align:center;padding:3rem;color:#2d3748">' +
            '<h1>אין חיבור לאינטרנט</h1><p>הדף הזה עדיין לא נשמר לצפייה במצב לא מקוון.</p>' +
            '<p><a href="/index.html">חזרה לדף הבית</a></p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        });
      });
    })
  );
});
