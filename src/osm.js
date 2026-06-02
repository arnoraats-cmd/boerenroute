/* ═══════════════════════════════════════════════════════════════
   osm.js — live winkels via Overpass API
   Promise.race voor timeouts — GEEN AbortController (zie CLAUDE.md)
   ═══════════════════════════════════════════════════════════════ */

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const TIMEOUT_MS = 12000;
let _nextId = 100; // OSM-ids starten op 100 (zie CLAUDE.md)

/* ══ Publiek API ════════════════════════════════════════════════ */

export async function loadOSMShops(lat, lng, radiusKm) {
  const body  = _buildQuery(lat, lng, Math.round(radiusKm * 1000));
  const opts  = { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };

  const fetches = ENDPOINTS.map(url =>
    fetch(url, opts).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
  );

  const timeout = new Promise((_, rej) =>
    setTimeout(() => rej(new Error('Overpass timeout')), TIMEOUT_MS)
  );

  const data = await Promise.race([Promise.any(fetches), timeout]);
  return _parse(data.elements || []);
}

/* ══ Query ═══════════════════════════════════════════════════════ */

function _buildQuery(lat, lng, r) {
  return `data=[out:json][timeout:10];
(
  node["shop"~"^(farm|dairy|horticulture)$"](around:${r},${lat},${lng});
  node["amenity"="vending_machine"]["vending"~"milk|eggs|cheese|vegetables"](around:${r},${lat},${lng});
  node["shop"="greengrocer"]["organic"~"yes|only"](around:${r},${lat},${lng});
  way["shop"~"^(farm|dairy)$"](around:${r},${lat},${lng});
  relation["shop"~"^(farm|dairy)$"](around:${r},${lat},${lng});
);out center;`;
}

/* ══ Parser ══════════════════════════════════════════════════════ */

function _parse(elements) {
  const shops = [];

  for (const el of elements) {
    const tags = el.tags || {};
    const lat  = el.lat ?? el.center?.lat;
    const lng  = el.lon ?? el.center?.lon;
    if (!lat || !lng || !tags.name) continue;

    const addr = [
      tags['addr:street'],
      tags['addr:housenumber'],
      tags['addr:city'],
    ].filter(Boolean).join(' ') || tags['addr:full'] || 'Zie kaart';

    const type  = _type(tags);
    const emoji = _emoji(type, tags);

    shops.push({
      id:       _nextId++,
      emoji,
      name:     tags.name,
      type,
      premium:  false,
      seasonal: false,
      lat,
      lng,
      address:  addr,
      hours:    tags.opening_hours ?? null,
      products: _products(tags),
      tags:     _tags(tags),
      placeId:  null,
      googleRating:  null,
      googleReviews: null,
      dagVers:  null,
      desc:     tags.description ?? null,
      osm:      true,
      osmId:    el.id,
    });
  }

  return shops;
}

function _type(t) {
  if (t.amenity === 'vending_machine') return 'automaat';
  return 'winkel';
}

function _emoji(type, t) {
  if (t.shop === 'dairy' || t.vending === 'milk') return '🥛';
  if (t.vending === 'eggs')                        return '🥚';
  if (t.vending === 'cheese')                      return '🧀';
  if (type === 'automaat')                          return '🛒';
  return '🌱';
}

function _products(t) {
  const p = [];
  if (t.vending)  p.push(t.vending.replace(/_/g, ' '));
  if (t.produce)  p.push(...t.produce.split(';').map(s => s.trim()));
  if (t.shop === 'dairy')        p.push('melk', 'zuivel');
  if (t.shop === 'farm')         p.push('streekproducten');
  if (t.shop === 'horticulture') p.push('planten', 'groente');
  return [...new Set(p)].filter(Boolean);
}

function _tags(t) {
  const r = [];
  if (t.shop === 'dairy' || t.vending === 'milk') r.push('zuivel');
  if (t.vending === 'eggs')                        r.push('eieren');
  if (t.shop === 'farm')                           r.push('groente');
  if (t.organic === 'yes' || t.organic === 'only') r.push('biologisch');
  return r;
}
