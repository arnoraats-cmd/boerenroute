/* Service Worker — Boerenroute.nl */
const CACHE   = 'boerenroute-v21';
const OFFLINE = [
  '/',
  '/styles/main.css',
  '/public/images/hero.jpg',
  '/src/main.js',
  '/src/shops.js',
  '/src/map.js',
  '/src/route.js',
  '/src/location.js',
  '/src/modals.js',
  '/src/season.js',
  '/src/osm.js',
  '/src/boodschappenlijst.js',
  '/src/stamps.js',
  '/src/stempelkaart.js',
  '/src/blog.js',
  '/src/bottomsheet.js',
  '/src/data/verifiedShops.json',
  '/src/data/routes.json',
  '/src/data/blog.json',
  'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    /* addAll faalt als één bestand ontbreekt; per stuk cachen is robuuster */
    caches.open(CACHE)
      .then(c => Promise.allSettled(OFFLINE.map(u => c.add(u))))
      .then(() => self.skipWaiting())
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
  const req = e.request;
  if (req.method !== 'GET') return;

  /* Tiles + live API's: nooit via de SW (te groot / moet altijd vers) */
  if (/tile|overpass|nominatim|formspree|goatcounter|router\.project-osrm/.test(req.url)) return;

  const sameOrigin = new URL(req.url).origin === self.location.origin;

  if (sameOrigin) {
    /* App-bestanden (HTML/JS/CSS/JSON): network-first.
       Zo zien terugkerende bezoekers na een deploy meteen de nieuwe versie;
       offline valt het terug op de cache. */
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req).then(c => c || caches.match('/')))
    );
  } else {
    /* CDN-assets (fonts, Leaflet): cache-first — die zijn versievast. */
    e.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          if (res && res.status === 200 && res.type !== 'opaque') {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(req, clone));
          }
          return res;
        });
      })
    );
  }
});
