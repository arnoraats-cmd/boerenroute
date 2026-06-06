/* ═══════════════════════════════════════════════════════════════
   Cloudflare Pages Function — POST /api/route

   Proxy voor de fietsrouting met:
   • edge-cache in KV (optioneel: binding ROUTE_CACHE)  → herhaalde routes €0
   • BRouter als primaire engine (gratis, geen key)
   • OpenRouteService als fallback (optioneel: secret ORS_KEY)

   Werkt zonder enige setup (alleen BRouter). KV en ORS_KEY zijn optioneel
   en springen vanzelf aan zodra ze in Cloudflare zijn ingesteld.
   Geen secrets in de frontend (zie CLAUDE.md) — de key leeft in env.ORS_KEY.
   ═══════════════════════════════════════════════════════════════ */

export async function onRequestPost({ request, env }) {
  let payload;
  try { payload = await request.json(); }
  catch { return json({ error: 'bad json' }, 400); }

  const raw     = Array.isArray(payload.points) ? payload.points : null;
  const profile = typeof payload.profile === 'string' ? payload.profile : 'trekking';
  if (!raw || raw.length < 2) return json({ error: 'need >=2 points' }, 400);

  // Afronden op 5 decimalen → stabiele cache-sleutel
  const points = raw.map(p => ({ lat: +(+p.lat).toFixed(5), lng: +(+p.lng).toFixed(5) }));
  const key = 'r:' + await hashKey({ points, profile });

  // 1) Cache (alleen als KV gekoppeld is)
  if (env.ROUTE_CACHE) {
    const hit = await env.ROUTE_CACHE.get(key);
    if (hit) return json(JSON.parse(hit), 200, 'HIT');
  }

  // 2) BRouter → 3) ORS-fallback
  let data = null, err = null;
  try { data = await brouter(points, profile); } catch (e) { err = e; }
  if (!data && env.ORS_KEY) {
    try { data = await ors(points, env.ORS_KEY); } catch (e) { err = e; }
  }
  if (!data) return json({ error: 'routing failed', detail: String(err) }, 502);

  // 4) Wegschrijven naar cache (30 dagen)
  if (env.ROUTE_CACHE) {
    try { await env.ROUTE_CACHE.put(key, JSON.stringify(data), { expirationTtl: 60 * 60 * 24 * 30 }); }
    catch { /* cache-fout mag de route niet breken */ }
  }
  return json(data, 200, 'MISS');
}

/* ══ Engines ═════════════════════════════════════════════════════ */

async function brouter(points, profile) {
  const lonlats = points.map(p => `${p.lng},${p.lat}`).join('|');
  const url = `https://brouter.de/brouter?lonlats=${lonlats}`
            + `&profile=${encodeURIComponent(profile)}&alternativeidx=0&format=geojson`;
  const r = await fetch(url);
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

async function ors(points, key) {
  const body = JSON.stringify({ coordinates: points.map(p => [p.lng, p.lat]), elevation: true });
  const r = await fetch('https://api.openrouteservice.org/v2/directions/cycling-regular/geojson', {
    method: 'POST',
    headers: { Authorization: key, 'Content-Type': 'application/json' },
    body,
  });
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
    messages:     [],            // ORS levert geen per-segment wegtags → score verbergt zich
    engine:      'ors',
  };
}

/* ══ Helpers ═════════════════════════════════════════════════════ */

async function hashKey(obj) {
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function json(obj, status = 200, cache) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Route-Cache': cache || 'OFF' },
  });
}
