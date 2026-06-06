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
   points: [{lat,lng}, …] — sluit de lus door zelf het startpunt achteraan te zetten. */
export async function routeVia(points, { profile = 'trekking', timeoutMs = 9000 } = {}) {
  if (!Array.isArray(points) || points.length < 2) return null;

  const timeout = () => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs));

  // 1) BRouter — recreatief profiel
  try {
    return await Promise.race([_brouter(points, profile), timeout()]);
  } catch { /* val terug op OSRM */ }

  // 2) OSRM — laatste redmiddel (snelste lijn, maar tekent tenminste iets)
  try {
    return await Promise.race([_osrm(points), timeout()]);
  } catch {
    return null;
  }
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
    geometry:   feat.geometry,                          // LineString [lon,lat,ele]
    distanceKm: (parseFloat(p['track-length'])   || 0) / 1000,
    ascendM:     parseFloat(p['filtered ascend']) || 0,
    engine:     'brouter',
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
    geometry:   d.routes[0].geometry,
    distanceKm: d.routes[0].distance / 1000,
    ascendM:    0,
    engine:    'osrm',
  };
}
