/* Bump CACHE (…-v1 → -v2 → …) whenever you change files, to invalidate old caches. */
var CACHE = 'trip-v4';
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
        return cached || caches.match('/index.html');
      });
    })
  );
});
