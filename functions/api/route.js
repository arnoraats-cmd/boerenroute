/* ═══════════════════════════════════════════════════════════════
   Cloudflare Pages Function — POST /api/route

   Cache-volgorde:
   1. Cloudflare Cache API  — gratis edge-cache, geen setup nodig, 24u TTL
   2. KV (ROUTE_CACHE)      — optioneel, 30 dagen, werkt zodra binding gezet is
   3. BRouter direct        — gratis, geen key, recreatief profiel
   4. ORS-fallback          — optioneel, kwalitatief beter dan OSRM, key in env.ORS_KEY

   Geen secrets in de frontend (zie CLAUDE.md).
   ═══════════════════════════════════════════════════════════════ */

const CACHE_URL_PREFIX = 'https://boerenroute-route-cache.internal/';

export async function onRequestPost({ request, env }) {
  let payload;
  try { payload = await request.json(); }
  catch { return _json({ error: 'bad json' }, 400); }

  const raw     = Array.isArray(payload.points) ? payload.points : null;
  const profile = typeof payload.profile === 'string' ? payload.profile : 'trekking';
  if (!raw || raw.length < 2) return _json({ error: 'need >=2 points' }, 400);

  // Afronden op 5 decimalen → stabiele cache-sleutel (< 11m nauwkeurigheid)
  const points = raw.map(p => ({ lat: +(+p.lat).toFixed(5), lng: +(+p.lng).toFixed(5) }));
  const hash   = await _hash({ points, profile });
  const kvKey  = 'r:' + hash;
  const cacheReq = new Request(CACHE_URL_PREFIX + hash);

  // 1) Cloudflare Cache API — gratis, geen binding nodig
  const edgeCache = caches.default;
  const cached = await edgeCache.match(cacheReq);
  if (cached) {
    const body = await cached.json();
    return _json(body, 200, 'EDGE-HIT');
  }

  // 2) KV — als binding gezet is
  if (env.ROUTE_CACHE) {
    const hit = await env.ROUTE_CACHE.get(kvKey);
    if (hit) {
      const body = JSON.parse(hit);
      // Backfill edge-cache zodat de volgende request gratis is
      await edgeCache.put(cacheReq, _cacheResponse(body, 86400));
      return _json(body, 200, 'KV-HIT');
    }
  }

  // 3) BRouter — één retry bij timeout of server-fout
  let data = null, err = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try { data = await _brouter(points, profile); break; }
    catch (e) {
      err = e;
      if (attempt === 0) await _sleep(800); // korte pauze voor retry
    }
  }

  // 4) ORS-fallback (alleen als key aanwezig)
  if (!data && env.ORS_KEY) {
    try { data = await _ors(points, env.ORS_KEY); }
    catch (e) { err = e; }
  }

  if (!data) return _json({ error: 'routing failed', detail: String(err) }, 502);

  // Opslaan in edge-cache (24u) en KV (30 dagen) voor volgende requests
  await edgeCache.put(cacheReq, _cacheResponse(data, 86400));
  if (env.ROUTE_CACHE) {
    try { await env.ROUTE_CACHE.put(kvKey, JSON.stringify(data), { expirationTtl: 60 * 60 * 24 * 30 }); }
    catch { /* cache-fout mag de route niet breken */ }
  }

  return _json(data, 200, 'MISS');
}

/* ══ Engines ═════════════════════════════════════════════════════ */

async function _brouter(points, profile) {
  const lonlats = points.map(p => `${p.lng},${p.lat}`).join('|');
  const url = `https://brouter.de/brouter?lonlats=${lonlats}`
            + `&profile=${encodeURIComponent(profile)}&alternativeidx=0&format=geojson`;
  const r = await _fetchTimeout(url, {}, 8000);
  if (!r.ok) throw new Error('brouter ' + r.status);
  const gj = await r.json();
  const f  = gj.features?.[0];
  if (!f?.geometry) throw new Error('brouter empty');
  const p = f.properties || {};
  return {
    geometry:     f.geometry,
    distanceKm:   (parseFloat(p['track-length'])   || 0) / 1000,
    ascendM:       parseFloat(p['filtered ascend']) || 0,
    totalTimeSec:  parseFloat(p['total-time'])      || 0,
    messages:      p.messages || [],
    engine:       'brouter',
  };
}

async function _ors(points, key) {
  const body = JSON.stringify({ coordinates: points.map(p => [p.lng, p.lat]), elevation: true });
  const r = await _fetchTimeout('https://api.openrouteservice.org/v2/directions/cycling-regular/geojson', {
    method: 'POST',
    headers: { Authorization: key, 'Content-Type': 'application/json' },
    body,
  }, 8000);
  if (!r.ok) throw new Error('ors ' + r.status);
  const gj = await r.json();
  const f  = gj.features?.[0];
  if (!f?.geometry) throw new Error('ors empty');
  const s = f.properties?.summary || {};
  return {
    geometry:     f.geometry,
    distanceKm:   (s.distance || 0) / 1000,
    ascendM:       s.ascent   || 0,
    totalTimeSec:  s.duration || 0,
    messages:     [],
    engine:      'ors',
  };
}

/* ══ Helpers ═════════════════════════════════════════════════════ */

async function _hash(obj) {
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function _sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function _fetchTimeout(url, opts, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...opts, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

function _cacheResponse(obj, maxAge) {
  return new Response(JSON.stringify(obj), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${maxAge}`,
    },
  });
}

function _json(obj, status = 200, cacheHdr) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Route-Cache': cacheHdr || 'OFF',
    },
  });
}
