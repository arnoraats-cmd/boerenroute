/* Service Worker — Boerenroute.nl */
const CACHE   = 'boerenroute-v1';
const OFFLINE = [
  '/',
  '/styles/main.css',
  '/src/main.js',
  '/src/shops.js',
  '/src/map.js',
  '/src/route.js',
  '/src/location.js',
  '/src/modals.js',
  '/src/season.js',
  '/src/osm.js',
  '/src/boodschappenlijst.js',
  '/src/data/verifiedShops.json',
  '/src/data/maandroute.json',
  'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(OFFLINE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  /* Tile-verzoeken niet cachen (te groot) */
  if (e.request.url.includes('tile') || e.request.url.includes('overpass') ||
      e.request.url.includes('nominatim') || e.request.url.includes('formspree') ||
      e.request.url.includes('goatcounter')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match('/'));
    })
  );
});
