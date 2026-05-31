// Service Worker voor Boerenroute.nl
// Zorgt dat de app installeerbaar is en offline een basisversie toont.

const CACHE_NAME = 'boerenroute-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
];

// Installatie: cache de kernbestanden
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activatie: ruim oude caches op
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch-strategie:
// - Kaartdata, API-verzoeken en statistieken: altijd via het netwerk (niet cachen)
// - De pagina zelf: network-first, val terug op cache als offline
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Externe API's en data nooit cachen
  if (
    url.includes('overpass') ||
    url.includes('nominatim') ||
    url.includes('formspree') ||
    url.includes('goatcounter') ||
    url.includes('tile.openstreetmap')
  ) {
    return; // laat de browser het normaal afhandelen
  }

  // Alleen GET-verzoeken cachen
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // verse versie ophalen en in cache zetten
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(r => r || caches.match('/index.html')))
  );
});
