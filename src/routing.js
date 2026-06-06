/* ═══════════════════════════════════════════════════════════════
   routing.js — fietsroute-geometrie via een recreatieve engine.

   Primair: BRouter (gratis, geen API-key, kent OSM-fietstags →
   autoluwe/recreatieve routes i.p.v. de "snelste lijn"). BRouter zet
   open CORS-headers, dus dit werkt direct vanuit de browser.
   Fallback: OSRM-demo (zoals voorheen) als BRouter onbereikbaar is.

   Timeout met Promise.race — GEEN AbortController (zie CLAUDE.md).
   ═══════════════════════════════════════════════════════════════ */

const BROUTER = 'https://brouter.de/brouter';
const OSRM    = 'https://router.project-osrm.org/route/v1/cycling';

/* Geef { geometry (GeoJSON LineString), distanceKm, ascendM, engine } of null.
   points: [{lat,lng}, …] — sluit de lus door zelf het startpunt achteraan te zetten.

   Volgorde: (1) eigen /api/route-proxy (edge-cache + ORS-fallback, key verborgen),
   (2) BRouter direct (werkt ook lokaal/zonder functie), (3) OSRM. */
export async function routeVia(points, { profile = 'trekking', timeoutMs = 9000 } = {}) {
  if (!Array.isArray(points) || points.length < 2) return null;

  const timeout = () => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs));

  // 1) Eigen proxy (Cloudflare Pages Function) — cache + fallback
  try {
    return await Promise.race([_proxy(points, profile), timeout()]);
  } catch { /* niet gedeployed / lokaal → val terug op directe BRouter */ }

  // 2) BRouter direct — recreatief profiel
  try {
    return await Promise.race([_brouter(points, profile), timeout()]);
  } catch { /* val terug op OSRM */ }

  // 3) OSRM — laatste redmiddel (snelste lijn, maar tekent tenminste iets)
  try {
    return await Promise.race([_osrm(points), timeout()]);
  } catch {
    return null;
  }
}

/* ══ Proxy (eigen Pages Function) ════════════════════════════════ */

async function _proxy(points, profile) {
  const r = await fetch('/api/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points, profile }),
  });
  if (!r.ok) throw new Error('proxy ' + r.status);
  const d = await r.json();
  if (!d?.geometry) throw new Error('proxy empty');
  return d;
}

/* ══ BRouter ═════════════════════════════════════════════════════ */

async function _brouter(points, profile) {
  const lonlats = points.map(p => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join('|');
  const url = `${BROUTER}?lonlats=${lonlats}&profile=${encodeURIComponent(profile)}`
            + `&alternativeidx=0&format=geojson`;

  const r = await fetch(url);
  if (!r.ok) throw new Error('brouter ' + r.status);

  const gj   = await r.json();
  const feat = gj.features?.[0];
  if (!feat?.geometry) throw new Error('brouter empty');

  const p = feat.properties || {};
  return {
    geometry:     feat.geometry,                        // LineString [lon,lat,ele]
    distanceKm:   (parseFloat(p['track-length'])   || 0) / 1000,
    ascendM:       parseFloat(p['filtered ascend']) || 0,
    totalTimeSec:  parseFloat(p['total-time'])      || 0,
    messages:      p.messages || [],                    // per-segment WayTags voor scoring
    engine:       'brouter',
  };
}

/* ══ OSRM-fallback ═══════════════════════════════════════════════ */

async function _osrm(points) {
  const coords = points.map(p => `${p.lng},${p.lat}`).join(';');
  const r = await fetch(`${OSRM}/${coords}?geometries=geojson&overview=full&steps=false`);
  if (!r.ok) throw new Error('osrm ' + r.status);

  const d = await r.json();
  if (d.code !== 'Ok' || !d.routes?.[0]) throw new Error('osrm no route');

  return {
    geometry:     d.routes[0].geometry,
    distanceKm:   d.routes[0].distance / 1000,
    ascendM:      0,
    totalTimeSec: d.routes[0].duration || 0,
    messages:     [],                                   // geen wegtags ⇒ geen score
    engine:      'osrm',
  };
}
