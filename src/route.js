/* ═══════════════════════════════════════════════════════════════
   route.js — stops beheren, nearest-neighbour optimalisatie,
               GPX-export, Google Maps, delen
   ═══════════════════════════════════════════════════════════════ */

import { drawRoute, setRouteMarkers } from './map.js';

/* ── State ──────────────────────────────────────────────────── */
let _stops  = [];    // shop-objecten in volgorde
let _allRef = [];    // referentie naar de volledige dataset

/* ══ Init ════════════════════════════════════════════════════════ */

let _bound = false;

export function initRoute(allShops) {
  _allRef = allShops;
  /* Panel-listeners maar één keer binden (initRoute draait opnieuw bij OSM-toevoeging) */
  if (!_bound) { _bindPanel(); _bound = true; }
  _renderPanel();
}

/* ══ Publiek API ════════════════════════════════════════════════ */

export function toggleStop(shopId) {
  isInRoute(shopId) ? _remove(shopId) : _add(shopId);
}

export function isInRoute(shopId) {
  return _stops.some(s => s.id === shopId);
}

export function getStops()   { return [..._stops]; }
export function getCount()   { return _stops.length; }
export function clearRoute() { _clear(); }

/* ══ Interne mutaties ════════════════════════════════════════════ */

function _add(shopId) {
  const shop = _allRef.find(s => s.id === shopId);
  if (!shop || isInRoute(shopId)) return;
  const wasEmpty = _stops.length === 0;
  _stops.push(shop);
  _sync();
  /* Schakel automatisch naar route-tab bij eerste stop */
  if (wasEmpty) {
    document.querySelector('.nav-btn[data-page="route"]')?.click();
  }
}

function _remove(shopId) {
  _stops = _stops.filter(s => s.id !== shopId);
  _sync();
}

function _clear() {
  _stops = [];
  _sync();
}

function _optimize() {
  if (_stops.length < 3) return;
  _stops = _nearestNeighbour([..._stops]);
  _sync();
}

/* Stuur veranderingen door naar kaart + panel */
function _sync() {
  drawRoute(_stops);
  setRouteMarkers(_stops);
  _renderPanel();
  _updateBadge();
  /* Informeer shops.js zodat kaart-knoppen updaten */
  document.dispatchEvent(new CustomEvent('boerenroute:routechange'));
}

/* ══ Panel-binding ═══════════════════════════════════════════════ */

function _bindPanel() {
  document.getElementById('clearRouteBtn')?.addEventListener('click', _clear);
  document.getElementById('optimizeBtn')?.addEventListener('click', _optimize);
  document.getElementById('gpxBtn')?.addEventListener('click', _downloadGPX);
  document.getElementById('shareBtn')?.addEventListener('click', _share);

  /* Echte wegafstand van OSRM ontvangen */
  document.addEventListener('boerenroute:routedistance', e => {
    const distEl = document.getElementById('routeTotalDist');
    if (distEl && _stops.length >= 2) {
      distEl.textContent = `${_fmt(e.detail.km)} totaal`;
    }
  });
}

/* ══ Panel renderen ══════════════════════════════════════════════ */

function _renderPanel() {
  const stopsEl   = document.getElementById('routeStops');
  const emptyEl   = document.getElementById('routeEmpty');
  const actionsEl = document.getElementById('routeActions');
  const metaEl    = document.getElementById('routeMeta');
  const mapsLink  = document.getElementById('mapsLink');
  if (!stopsEl) return;

  const hasStops = _stops.length > 0;
  if (emptyEl)   emptyEl.hidden   = hasStops;
  if (actionsEl) actionsEl.hidden = !hasStops;
  if (metaEl)    metaEl.hidden    = !hasStops;

  if (!hasStops) { stopsEl.innerHTML = ''; return; }

  /* Bereken afstanden per etappe */
  let totalKm = 0;
  const legs  = _stops.map((shop, i) => {
    if (i === 0) return { shop, leg: null };
    const d = _haversine(_stops[i-1].lat, _stops[i-1].lng, shop.lat, shop.lng);
    totalKm += d;
    return { shop, leg: d };
  });

  /* Toon totaal */
  const distEl = document.getElementById('routeTotalDist');
  if (distEl) distEl.textContent = `${_fmt(totalKm)} totaal`;

  /* Google Maps-link bijwerken */
  if (mapsLink) mapsLink.href = _mapsUrl(_stops);

  /* Stop-items */
  stopsEl.innerHTML = legs.map(({ shop, leg }, i) => `
<li class="route-stop" data-id="${shop.id}">
  <span class="stop-num">${i + 1}</span>
  <span class="stop-emoji">${shop.emoji}</span>
  <div class="stop-info">
    <div class="stop-name">${_esc(shop.name)}</div>
    <div class="stop-addr">${_esc(shop.address)}</div>
    ${leg ? `<div class="stop-leg">← ${_fmt(leg)}</div>` : ''}
  </div>
  <button class="stop-rm" data-id="${shop.id}"
    aria-label="Verwijder ${_esc(shop.name)} uit route">✕</button>
</li>`).join('');

  stopsEl.querySelectorAll('.stop-rm').forEach(btn =>
    btn.addEventListener('click', () => _remove(+btn.dataset.id))
  );
}

function _updateBadge() {
  const badge = document.getElementById('routeBadge');
  if (!badge) return;
  badge.textContent = _stops.length;
  badge.hidden = _stops.length === 0;
}

/* ══ Nearest-neighbour optimalisatie ════════════════════════════ */

function _nearestNeighbour(shops) {
  const result    = [shops[0]];
  const remaining = shops.slice(1);
  while (remaining.length) {
    const last = result[result.length - 1];
    let ni = 0, nd = Infinity;
    remaining.forEach((s, i) => {
      const d = _haversine(last.lat, last.lng, s.lat, s.lng);
      if (d < nd) { nd = d; ni = i; }
    });
    result.push(remaining.splice(ni, 1)[0]);
  }
  return result;
}

/* ══ Export ══════════════════════════════════════════════════════ */

function _downloadGPX() {
  if (!_stops.length) return;
  const now  = new Date().toISOString();
  const wpts = _stops.map(s => `
  <wpt lat="${s.lat}" lon="${s.lng}">
    <name>${_esc(s.name)}</name>
    <desc>${_esc(s.address)}${s.hours ? ' · ' + _esc(s.hours) : ''}</desc>
  </wpt>`).join('');

  const rtepts = _stops.map((s, i) => `
    <rtept lat="${s.lat}" lon="${s.lng}">
      <name>${i + 1}. ${_esc(s.name)}</name>
    </rtept>`).join('');

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Boerenroute.nl"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata><name>Boerenroute</name><time>${now}</time></metadata>
${wpts}
  <rte>
    <name>Boerenroute ${new Date().toLocaleDateString('nl-NL')}</name>
${rtepts}
  </rte>
</gpx>`;

  const blob = new Blob([gpx], { type: 'application/gpx+xml' });
  const a    = Object.assign(document.createElement('a'), {
    href:     URL.createObjectURL(blob),
    download: `boerenroute-${Date.now()}.gpx`,
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

function _mapsUrl(stops) {
  if (!stops.length) return '#';
  const MAX = 10; // Google Maps-limiet
  const pts = stops.slice(0, MAX);
  const origin = `${pts[0].lat},${pts[0].lng}`;
  const dest   = `${pts[pts.length - 1].lat},${pts[pts.length - 1].lng}`;
  const wps    = pts.slice(1, -1).map(s => `${s.lat},${s.lng}`).join('|');
  const params = new URLSearchParams({
    api: '1', origin, destination: dest, travelmode: 'bicycling',
  });
  if (wps) params.set('waypoints', wps);
  return `https://www.google.com/maps/dir/?${params}`;
}

async function _share() {
  const url  = _mapsUrl(_stops);
  const text = `Mijn Boerenroute langs ${_stops.length} stop${_stops.length !== 1 ? 's' : ''}:\n`
    + _stops.map((s, i) => `${i + 1}. ${s.name} — ${s.address}`).join('\n');

  if (navigator.share) {
    try {
      await navigator.share({ title: 'Boerenroute', text, url });
      return;
    } catch { /* viel terug op WhatsApp */ }
  }
  window.open(
    `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`,
    '_blank', 'noopener'
  );
}

/* ══ Hulpfuncties ════════════════════════════════════════════════ */

function _haversine(lat1, lng1, lat2, lng2) {
  const R = 6371, dL = (lat2-lat1)*Math.PI/180, dG = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dL/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dG/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function _fmt(km) {
  if (km < 1)  return `${Math.round(km*1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function _esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
